export default {
  // 服务器配置
  port: process.env.PORT || 3001,
  
  // 微信配置
  wechat: {
    // 白名单用户（微信号）
    allowedUsers: [],
    // 是否启用图片消息
    enableImage: true,
    // 最大消息长度
    maxMessageLength: 2000
  },
  
  // MiMoCode配置
  mimo: {
    // 命令超时时间（毫秒）
    timeout: 30000,
    // 最大输出长度
    maxOutputLength: 4000
  }
};
