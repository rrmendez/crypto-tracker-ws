export const getWelcomeHtml = (systemName: string): string => {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${systemName}</title>
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
      background: #0b0f19;
      color: #e6e6e6;
    }
    h1 {
      font-weight: 600;
      letter-spacing: .3px;
    }
  </style>
</head>
<body>
  <h1>${systemName}</h1>
</body>
</html>`;
};
