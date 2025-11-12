# Web-based Multiplayer Online Battle Game

A simple multiplayer online battle game built with Django and WebSocket, suitable for web development beginners to learn and reference.



## 🎮 Project Overview

WebMoba is a lightweight multiplayer online battle game that runs in the browser, allowing players to match in real-time and engage in battles. The main purpose of this project is to demonstrate how to build a real-time interactive web application using Django full-stack development.

**Key Features:**

- Real-time multiplayer battles
- WebSocket persistent connections
- Simple matchmaking system
- Responsive game interface

## 🛠 Technology Stack

### Backend

- **Django** - Web framework
- **Django Channels** - WebSocket support
- **Thrift** - RPC framework (match service)
- **Redis** - Caching and Channels layer

### Frontend

- **HTML5 Canvas** - Game rendering
- **jQuery** - DOM manipulation and event handling
- **WebSocket** - Real-time communication
- **Bootstrap** - UI framework

### Deployment

- **Daphne** - ASGI server
- **Nginx** - Reverse proxy and static file serving

--------



## 📁 Project Structure

```
WebMoba/
├── acapp/                 # Django main application
├── game/                  # Core game logic
├── multiplayer/           # Multiplayer WebSocket handling
├── match_system/          # Matchmaking service
├── scripts/               # Deployment scripts
├── static/               # Static resources
└── templates/            # Frontend templates
```

### Complete Service Startup Process

Here is the complete sequence to start all required services:

1. **Start Nginx service**

```bash
sudo /etc/init.d/nginx start
```

*Nginx acts as a reverse proxy and serves static files*

2. **Start Redis server**

```bash
sudo redis-server /etc/redis/redis.conf
```

*Redis is used for caching and as the channel layer for WebSocket connections*

3. **Start uWSGI service**

```bash
cd ~/acapp
uwsgi --ini scripts/uwsgi.ini
```

*uWSGI handles the standard Django WSGI requests*

4. **Start Django Channels (Daphne)**

```bash
cd ~/acapp
daphne -b 0.0.0.0 -p 5015 acapp.asgi:application
```

*Daphne handles WebSocket connections on port 5015*

5. **Start Match System Server**

```bash
cd ~/acapp/match_system/src/match_server
python main.py
```

*The matchmaking service runs separately on port 9090*
