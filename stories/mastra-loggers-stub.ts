// Storybook用のモック: @mastra/loggers
// pino-prettyがnode:streamとnode:worker_threadsを使用するため、モックに置き換える

export class PinoLogger {
  constructor(options?: any) {
    // コンストラクタは何もしない
  }

  info = () => {};
  error = () => {};
  warn = () => {};
  debug = () => {};
  trace = () => {};
  fatal = () => {};
}

export default PinoLogger;
