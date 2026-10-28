(function () {
  "use strict";

  const STORAGE_KEY = "muzhe-flyer-editor-v1";
  const root = document.documentElement;
  const body = document.body;
  const sheets = Array.from(document.querySelectorAll(".sheet"));
  const pageItems = Array.from(document.querySelectorAll(".preview-item"));
  const status = document.getElementById("editorStatus");
  const replaceImageButton = document.getElementById("replaceImage");
  const imagePicker = document.getElementById("imagePicker");
  const zoomControl = document.getElementById("zoomControl");
  const zoomValue = document.getElementById("zoomValue");
  const typeControl = document.getElementById("typeControl");
  const typeValue = document.getElementById("typeValue");
  const brandColor = document.getElementById("brandColor");
  const editHints = document.getElementById("editHints");
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));

  let selectedImage = null;
  let saveTimer = null;
  let currentView = "both";

  const canEditWholeElement = (element) => {
    if (element.matches(".proof-main h3")) return true;
    return Array.from(element.children).every((child) => child.tagName === "BR");
  };

  const textCandidates = Array.from(
    document.querySelectorAll(".sheet h2, .sheet h3, .sheet h4, .sheet p, .sheet span, .sheet strong")
  );

  const editableText = [];
  textCandidates.forEach((element) => {
    if (!canEditWholeElement(element)) return;
    if (element.closest('[contenteditable="true"]')) return;
    element.contentEditable = "true";
    element.spellcheck = false;
    element.dataset.editId = `text-${editableText.length + 1}`;
    element.dataset.baseFontSize = String(parseFloat(getComputedStyle(element).fontSize));
    editableText.push(element);
  });

  const editableImages = Array.from(document.querySelectorAll(".sheet img"));
  editableImages.forEach((image, index) => {
    image.dataset.editImage = `image-${index + 1}`;
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "传单图片"}，点击后可以替换`);
  });

  function mixHex(first, second, secondWeight) {
    const parse = (hex) => {
      const value = hex.replace("#", "");
      return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16));
    };
    const a = parse(first);
    const b = parse(second);
    const mixed = a.map((channel, index) => Math.round(channel * (1 - secondWeight) + b[index] * secondWeight));
    return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }

  function setBrandColor(color) {
    root.style.setProperty("--primary", color);
    root.style.setProperty("--primary-deep", mixHex(color, "#1a1201", 0.22));
    root.style.setProperty("--surface-orange", mixHex(color, "#fffdfb", 0.9));
    brandColor.value = color;
  }

  function setFontScale(value) {
    const ratio = Number(value) / 100;
    editableText.forEach((element) => {
      const baseSize = Number(element.dataset.baseFontSize);
      element.style.fontSize = `${(baseSize * ratio).toFixed(2)}px`;
    });
    typeControl.value = String(value);
    typeValue.value = `${value}%`;
  }

  function setPreviewZoom(value) {
    root.style.setProperty("--preview-zoom", String(Number(value) / 100));
    zoomControl.value = String(value);
    zoomValue.value = `${value}%`;
  }

  function setView(view) {
    currentView = view;
    pageItems.forEach((item) => {
      item.classList.toggle("is-hidden", view !== "both" && item.dataset.page !== view);
    });
    viewButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setStatus(message, kind) {
    status.textContent = message;
    status.classList.toggle("is-error", kind === "error");
    status.classList.toggle("is-success", kind === "success");
  }

  function selectImage(image) {
    if (selectedImage) selectedImage.classList.remove("is-selected");
    selectedImage = image;
    replaceImageButton.disabled = !selectedImage;
    if (selectedImage) {
      selectedImage.classList.add("is-selected");
      setStatus(`已选择图片：${selectedImage.alt || "未命名图片"}`);
    }
  }

  function captureState() {
    const text = {};
    editableText.forEach((element) => {
      text[element.dataset.editId] = element.innerHTML;
    });

    const images = {};
    editableImages.forEach((image) => {
      images[image.dataset.editImage] = image.getAttribute("src");
    });

    return {
      text,
      images,
      settings: {
        color: brandColor.value,
        fontScale: Number(typeControl.value),
        zoom: Number(zoomControl.value),
        view: currentView,
        hints: editHints.checked,
      },
    };
  }

  function applyState(state) {
    if (!state) return;

    editableText.forEach((element) => {
      const saved = state.text && state.text[element.dataset.editId];
      if (typeof saved === "string") element.innerHTML = saved;
    });

    editableImages.forEach((image) => {
      const saved = state.images && state.images[image.dataset.editImage];
      if (typeof saved === "string") image.setAttribute("src", saved);
    });

    const settings = state.settings || {};
    setBrandColor(settings.color || "#e8784a");
    setFontScale(settings.fontScale || 100);
    setPreviewZoom(settings.zoom || 100);
    setView(settings.view || "both");
    editHints.checked = settings.hints !== false;
    body.classList.toggle("show-edit-hints", editHints.checked);
  }

  function saveState(manual) {
    window.clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(captureState()));
      setStatus(manual ? "草稿已保存到当前浏览器" : "已自动保存", "success");
    } catch (error) {
      setStatus("保存失败，图片文件可能过大，请换一张较小的图片", "error");
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    setStatus("正在保存修改…");
    saveTimer = window.setTimeout(() => saveState(false), 450);
  }

  function checkPageFit() {
    const overflowed = sheets.some((sheet) => sheet.scrollHeight > sheet.clientHeight + 2);
    sheets.forEach((sheet) => {
      sheet.classList.toggle("has-overflow", sheet.scrollHeight > sheet.clientHeight + 2);
    });
    if (overflowed) {
      setStatus("内容超出 A4 页面，请缩短文字或调小字号", "error");
    }
  }

  function loadDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      applyState(JSON.parse(saved));
      setStatus("已恢复上次保存的草稿", "success");
      return true;
    } catch (error) {
      setStatus("草稿读取失败，已使用初始版本", "error");
      return false;
    }
  }

  const initialState = captureState();
  body.classList.add("show-edit-hints");
  loadDraft();

  editableText.forEach((element) => {
    element.addEventListener("input", () => {
      scheduleSave();
      window.setTimeout(checkPageFit, 0);
    });

    element.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });

    element.addEventListener("focus", () => selectImage(null));
  });

  editableImages.forEach((image) => {
    const choose = (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectImage(image);
    };
    image.addEventListener("click", choose);
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") choose(event);
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".sheet img") && !event.target.closest(".editor-toolbar")) {
      selectImage(null);
    }
  });

  replaceImageButton.addEventListener("click", () => {
    if (!selectedImage) {
      setStatus("请先点击一张传单图片", "error");
      return;
    }
    imagePicker.click();
  });

  imagePicker.addEventListener("change", () => {
    const file = imagePicker.files && imagePicker.files[0];
    if (!file || !selectedImage) return;
    if (file.size > 4 * 1024 * 1024) {
      setStatus("图片超过 4 MB，请先压缩后再上传", "error");
      imagePicker.value = "";
      return;
    }

    const targetImage = selectedImage;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      targetImage.src = String(reader.result);
      imagePicker.value = "";
      saveState(true);
      checkPageFit();
    });
    reader.addEventListener("error", () => setStatus("图片读取失败，请重新选择", "error"));
    reader.readAsDataURL(file);
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
      scheduleSave();
    });
  });

  zoomControl.addEventListener("input", () => {
    setPreviewZoom(zoomControl.value);
    scheduleSave();
  });

  typeControl.addEventListener("input", () => {
    setFontScale(typeControl.value);
    scheduleSave();
    window.setTimeout(checkPageFit, 0);
  });

  brandColor.addEventListener("input", () => {
    setBrandColor(brandColor.value);
    scheduleSave();
  });

  editHints.addEventListener("change", () => {
    body.classList.toggle("show-edit-hints", editHints.checked);
    scheduleSave();
  });

  document.getElementById("saveDraft").addEventListener("click", () => saveState(true));

  document.getElementById("resetDraft").addEventListener("click", () => {
    if (!window.confirm("确定恢复初始文案和图片吗？当前草稿将被清除。")) return;
    localStorage.removeItem(STORAGE_KEY);
    applyState(initialState);
    selectImage(null);
    setStatus("已恢复初始版本", "success");
    checkPageFit();
  });

  document.getElementById("printFlyer").addEventListener("click", () => {
    selectImage(null);
    window.print();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveState(true);
    }
  });

  window.addEventListener("beforeunload", () => saveState(false));
  checkPageFit();
})();
