# 新乐市天气接入

家长、教师和管理端首页 HERO 底部共用一条新乐市未来三天天气。天气是附属信息，失败时自动隐藏，不影响排课、待办或成长数据。

## 配置

在服务器的应用环境变量中设置高德开放平台**Web 服务**类型的 Key：

```dotenv
AMAP_WEATHER_KEY="你的 Web 服务 Key"
```

不要加 `NEXT_PUBLIC_` 前缀，也不要提交真实密钥。当前线上采用 Docker Compose，环境文件为 `/opt/edu-manage-docker/source/.env`，`app` 服务通过 `env_file` 读取；修改文件后需要重新创建应用容器，单纯刷新网页不会生效。若以后改用独立运行包部署，环境文件则为 `/opt/edu-manage/shared/.env`。配置前天气条不会显示，不会使用虚构天气。

天气接口固定查询新乐市行政区划代码 `130184`，向高德天气 `/v3/weather/weatherInfo?extensions=all` 请求预报，显示从当天起的三天。请求在服务端完成，四秒超时，成功结果在进程内短暂复用 30 分钟；接口暂时失败时只在同一天内使用最多六小时的旧结果，否则隐藏。三端共用同一 API 路由和文案规则。

应用显示“天气数据：高德天气”及文档链接。使用前请确认你的 Key 是 **Web 服务** 类型，并核对高德开放平台的服务额度与适用条款。由于 Key 已曾在聊天中出现，建议在高德控制台轮换后再用于正式环境。

## 验证

1. 配置环境变量并重启应用。
2. 以任一角色登录，打开首页；天气条应显示三天的天气现象、最低至最高气温和相应提示。
3. 临时移除密钥或使接口不可达，天气条应消失，首页其余内容仍可用。

参考：[高德天气查询文档](https://lbs.amap.com/api/webservice/guide/api/weatherinfo)、[创建 Web 服务 Key](https://lbs.amap.com/api/webservice/create-project-and-key)。
