export default class HttpError extends Error {
  constructor({ status, message, details }) {
    super(message);
    this.status = status;
    this.message = message;
    this.details = details;
  }
}
