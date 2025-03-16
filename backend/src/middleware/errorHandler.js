const errorTypes = {
  HttpError: (err) => {
    return {
      type: 'error',
      status: err.status,
      message: err.message,
      details: err.details || 'No details provided.',
    };
  },
  ValidationError: (err) => {
    return {
      type: 'error',
      status: 400,
      message: 'Validation failed.',
      details: Object.values(err.errors)
        .map((field) => field.properties?.message)
        .join(' '),
    };
  },
  TokenExpiredError: () => {
    return {
      type: 'error',
      status: 401,
      message: 'Authentication error.',
      details: 'Expired token.',
    };
  },
  default: (err) => {
    return {
      type: 'error',
      status: err.statusCode || 500,
      message: err.message || 'Something went wrong.',
      details: 'No details provided.',
      error: err, // Remove in production
    };
  },
};

export default function errorHandler(err, req, res) {
  const errorType = errorTypes[err.constructor.name] || errorTypes.default;
  const { type, status, message, details, error } = errorType(err);

  console.error(
    `[${type}]: ${err.constructor.name}: ${req.method} >> ${req.originalUrl} >>`,
    `Message: ${message}`,
    `Details: ${details}`,
    `ErrorObject: ${JSON.stringify(error) || 'Not provided.'}`,
  );

  const errorResponse = {
    type,
    errorType: err.constructor.name,
    status,
    message,
    details: details || 'No details provided.',
    errorObject: error || 'Not provided.',
  };

  res.status(status).json(errorResponse);
}
