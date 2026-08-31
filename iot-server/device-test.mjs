import { WebSocket } from 'ws';

const tableId =
  Number(
    process.argv[2] ??
    1,
  );

const deviceId =
  process.argv[3] ??
  `TEST-TABLE-${tableId}`;

const token =
  process.env.IOT_DEVICE_TOKEN ??
  '';

const url =
  `ws://127.0.0.1:3010/ws?tableId=${encodeURIComponent(tableId)}&deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(token)}`;

console.log(
  'Connecting:',
  url.replace(
    token,
    '***',
  ),
);

const socket =
  new WebSocket(
    url,
  );

socket.on(
  'open',
  () => {
    console.log(
      'CONNECTED',
    );

    socket.send(
      JSON.stringify({
        type:
          'sync.request',
      }),
    );
  },
);

socket.on(
  'message',
  (raw) => {
    console.log(
      'MESSAGE:',
      JSON.stringify(
        JSON.parse(
          raw.toString(),
        ),
        null,
        2,
      ),
    );
  },
);

socket.on(
  'close',
  (
    code,
    reason,
  ) => {
    console.log(
      'CLOSED',
      code,
      reason.toString(),
    );
  },
);

socket.on(
  'error',
  (error) => {
    console.error(
      'ERROR',
      error.message,
    );
  },
);
