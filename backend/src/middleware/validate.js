export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validatsiya xatosi',
        details: parsed.error.flatten(),
      });
    }
    req.validated = parsed.data;
    next();
  };
}
