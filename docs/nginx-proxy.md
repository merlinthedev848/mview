# Sentinel nginx proxy

The web UI uses same-origin API calls outside local development. Behind HTTPS, keep the API on `/` and proxy go2rtc under `/go2rtc/` so login, WebSocket upgrades, and WebRTC signaling all stay on the public hostname.

```nginx
server {
    listen 443 ssl;
    http2 on;

    server_name sentinel.example.com;

    ssl_certificate /etc/letsencrypt/live/sentinel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sentinel.example.com/privkey.pem;

    location / {
        proxy_pass http://10.0.0.89:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /go2rtc/ {
        proxy_pass http://10.0.0.89:1984/;
        proxy_http_version 1.1;
        proxy_read_timeout 3600s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

For local Vite development on port 5173, the frontend still targets `http://<host>:8000` for the API and `http://<host>:1984` for go2rtc.
