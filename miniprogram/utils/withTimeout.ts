// 超时兜底：把「可能永不 settle 的 Promise」变成「限时内的明确结果」。
//
// 为什么必须有（2026-09-13 实战教训）：
// 微信云调用在「云环境不可用 / 开发者工具登录态过期 / 网络异常」时**可能长时间不返回也不报错**。
// app onLaunch 里裸 await 这种调用，会让 appLaunch 永远不结束——
// 表现就是：导航栏和 tabBar 都在，内容区整片空白，控制台还可能什么都没有。
// 加上超时后，同样的事故会退化成「进登录页 + 明确的失败提示 + 重试按钮」。
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null): void => {
      if (settled) return; // 只认第一次结果，迟到的一律丢弃
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => {
      console.error(`${label}超时（${ms}ms）：云端无响应，按失败处理`);
      finish(null);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        finish(value);
      },
      (error: unknown) => {
        console.error(`${label}失败`, error);
        clearTimeout(timer);
        finish(null);
      },
    );
  });
}
