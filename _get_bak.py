import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
sftp = cli.open_sftp()
for f in ["home.html.bak3-20261003", "home.html.bak2-20261003", "home.html.orig-20261003"]:
    try:
        st = sftp.stat("/srv/edu-manage/shared/public/" + f)
        print(f"  {f}: {st.st_size} B")
    except Exception as e:
        print(f"  {f}: 不存在")
# 取回 bak3（67044 版本，只差 meta 一行）
sftp.get("/srv/edu-manage/shared/public/home.html.bak3-20261003",
         r"D:\01muzhexuetang\muzhexuetang\coding\_preview\_home_67044.html")
print("  已取回 67044 版本到 _preview/_home_67044.html")
sftp.close(); cli.close()
