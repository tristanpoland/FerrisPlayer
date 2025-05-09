# FerrisPlayer

<div align="center">
  <img src="https://raw.githubusercontent.com/rust-lang/rust-artwork/master/logo/rust-logo-512x512.png" alt="FerrisPlayer Logo" width="120" />
  <h3>A sleek, fast, and modern self-hosted media server built with Rust</h3>
</div>

## ✨ Features

- **Lightning-fast** media server powered by Rust and Rocket
- **Beautiful UI** built with Next.js and Tailwind CSS
- **Automatic metadata fetching** from TMDB and other sources
- **Flexible library management** for movies, TV shows, and music
- **Smart scanning** that organizes your media automatically
- **Watch progress tracking** across all your devices
- **Responsive design** that works on desktop, tablet, and mobile

## 🚀 Getting Started

### Prerequisites

- Rust (1.70.0+)
- Node.js (18.0.0+)
- SQLite
- TMDB API key (for metadata)

### Installation

#### Backend

1. Clone the repository:
   ```bash
   git clone https://github.com/tristanpoland/ferrisplayer.git
   cd ferrisplayer/backend
   ```

2. Create a `.env` file with the following variables:
   ```
   DATABASE_URL=sqlite:database.db
   TMDB_API_KEY=your_tmdb_api_key
   RUST_LOG=info
   ```

3. Build and run the backend:
   ```bash
   cargo build --release
   cargo run --release
   ```

   The server will start on `http://localhost:8000`.

#### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The frontend will be available at `http://localhost:3000`.

## 📂 Media Organization

FerrisPlayer works best with organized media libraries. For optimal scanning:

### Movies
```
Movies/
  ├── Movie Title (2023).mp4
  ├── Another Movie (2022).mkv
  └── ...
```

### TV Shows
```
TV Shows/
  ├── Show Name/
  │   ├── Season 1/
  │   │   ├── Show Name S01E01.mp4
  │   │   ├── Show Name S01E02.mp4
  │   │   └── ...
  │   └── Season 2/
  │       ├── Show Name S02E01.mp4
  │       └── ...
  └── Another Show/
      └── ...
```

## ⚙️ Configuration

### Backend Configuration

The backend is configured through environment variables or a `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database URL | `sqlite:database.db` |
| `TMDB_API_KEY` | API key for The Movie Database | Required |
| `RUST_LOG` | Log level (error, warn, info, debug, trace) | `info` |
| `ROCKET_PORT` | Port to run the server on | `8000` |
| `ROCKET_ADDRESS` | Address to bind to | `0.0.0.0` |

### Frontend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL of the backend API | `http://localhost:8000/api` |

## 🎮 Usage

### Libraries Management

1. Add a new library in the Settings page by specifying:
   - Library name
   - Media path
   - Media type (Movies, TV Shows, Music)
   - Scan automatically option

2. Scan your library to detect all media files.

3. Browse your media from the homepage or dedicated sections.

### Playback

Click on any media item to view details and start playback. FerrisPlayer tracks your progress automatically.

## 📝 Development

### Backend Structure

```
backend/
├── src/
│   ├── api/           # API endpoints
│   ├── db/            # Database models and queries
│   ├── media/         # Media handling and scanning
│   ├── metadata/      # External metadata services
│   ├── error.rs       # Error handling
│   └── main.rs        # Application entry point
├── migrations/        # SQLite migrations
└── Cargo.toml         # Rust dependencies
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── lib/           # Utility functions
│   └── types/         # TypeScript definitions
├── public/            # Static assets
└── package.json       # JS dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Rust](https://www.rust-lang.org/) and [Rocket](https://rocket.rs/) for the backend
- [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/) for the frontend
- [TMDB](https://www.themoviedb.org/) for the metadata API
- [SQLx](https://github.com/launchbadge/sqlx) for the database interactions

---

<div align="center">
  <p>Built with ❤️ by [Your Name]</p>
</div>
