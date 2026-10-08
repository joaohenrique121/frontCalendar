const express = require('express');

const app = express();
const PORT = 3000;
const API = 'http://localhost:8000/api';

let token = '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Teste Google Calendar</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #111827;
            color: white;
            padding: 32px;
          }
          .box {
            max-width: 900px;
            margin: 0 auto;
            background: #1f2937;
            border-radius: 12px;
            padding: 24px;
          }
          button {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 18px;
            cursor: pointer;
            margin: 8px 8px 8px 0;
          }
          button.secondary {
            background: #16a34a;
          }
          pre {
            background: #0f172a;
            padding: 16px;
            border-radius: 8px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
          }
          input {
            width: 100%;
            margin-bottom: 12px;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #374151;
            background: #111827;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Teste Google Calendar</h2>

          <label>Email</label>
          <input id="email" value="admin@teste.com" />

          <label>Senha</label>
          <input id="senha" value="123456" type="password" />

          <button id="loginBtn">1. Fazer login no Laravel</button>
          <button id="googleBtn" class="secondary">2. Conectar com Google</button>
          <button id="eventBtn">3. Criar evento</button>

          <pre id="resultado">Resultado aparecerá aqui...</pre>
        </div>

        <script>
          const API = 'http://localhost:8000/api';

          let token = '';

          const setResult = (msg) => {
            document.getElementById('resultado').textContent = msg;
          };

          document.getElementById('loginBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;

            try {
              const res = await fetch(API + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
              });

              const data = await res.json();

              if (!data.access_token) {
                setResult(JSON.stringify(data, null, 2));
                return;
              }

              token = data.access_token;
              setResult('LOGIN OK\\n\\n' + JSON.stringify(data, null, 2));
              console.log('Token salvo:', token);
            } catch (err) {
              setResult('Erro no login: ' + err.message);
            }
          });

          document.getElementById('googleBtn').addEventListener('click', async () => {
            if (!token) {
              setResult('Faça login primeiro.');
              return;
            }

            const userId = 1;

            try {
              const res = await fetch('http://localhost:3000/api/google-url?user_id=' + userId, {
                method: 'GET',
                headers: {
                  Authorization: 'Bearer ' + token
                }
              });

              const data = await res.json();

              if (data && data.url) {
                window.open(data.url, '_blank');
                setResult('URL do Google aberta. Faça o login e autorize o acesso.');
              } else {
                setResult(JSON.stringify(data, null, 2));
              }
            } catch (err) {
              setResult('Erro ao buscar URL do Google: ' + err.message);
            }
          });

          document.getElementById('eventBtn').addEventListener('click', async () => {
            if (!token) {
              setResult('Faça login primeiro.');
              return;
            }

            const payload = {
              summary: 'Reunião de teste',
              description: 'Reunião criada via API',
              start: {
                dateTime: '2026-09-24T20:30:00-03:00',
                timeZone: 'America/Sao_Paulo'
              },
              end: {
                dateTime: '2026-09-24T21:30:00-03:00',
                timeZone: 'America/Sao_Paulo'
              },
              attendees: [{ email: 'aluno@exemplo.com' }],
              conferenceData: {
                createRequest: {
                  requestId: 'reuniao-123456789',
                  conferenceSolutionKey: {
                    type: 'hangoutsMeet'
                  }
                }
              }
            };

            try {
              const res = await fetch('http://localhost:3000/api/create-event', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + token
                },
                body: JSON.stringify(payload)
              });

              const data = await res.json();
              setResult(JSON.stringify(data, null, 2));
            } catch (err) {
              setResult('Erro ao criar evento: ' + err.message);
            }
          });
        </script>
      </body>
    </html>
  `);
});

app.get('/api/google-url', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const userId = req.query.user_id || 1;

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token do Laravel ausente.' });
  }

  const backendToken = authHeader.replace('Bearer ', '');

  try {
    const response = await fetch(`${API}/usuarios/google/calendar/connect?user_id=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`,
        Accept: 'application/json'
      },
      redirect: 'manual'
    });

    const location = response.headers.get('location');

    if (!location) {
      const raw = await response.text();
      return res.status(400).json({
        message: 'Não foi possível obter a URL do Google',
        raw
      });
    }

    return res.json({ url: location });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/api/create-event', async (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token do Laravel ausente.' });
  }

  const backendToken = authHeader.replace('Bearer ', '');

  try {
    const response = await fetch(`${API}/usuarios/1/google/calendar/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${backendToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de teste rodando em http://localhost:${PORT}`);
});