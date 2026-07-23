# 🎵 MusicNexus

A React Native Expo app for searching, rating, and organizing your favorite music using the Spotify API and Firebase.

## 🖼️ Screenshots
<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=1uAO2bztuwNYc9NepL7LS5_Ndv_Zo1TRg" alt="Library Screenshot" width="300">
      </td>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=1jxgcDJq31dc3gNqGsdvux5NvCounsAOh" alt="Rating Screenshot" width="300">
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=1N73QFPCcsLfkEE3g1MAIK0UsSr8QV_l_" alt="Quick Search Screenshot" width="300">
      </td>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=1D6wXFMs4BfnQkvn0a_jLBjrVuBZxdGub" alt="Search Screenshot" width="300">
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=11Lx16QsiGX24ILTAoWCf1kcWsEWUETS2" alt="History Screenshot" width="300">
      </td>
      <td align="center">
        <img src="https://drive.google.com/uc?export=view&id=1pw52V_oetJVpyB3E47ZoNyYNPnKhgDQb" alt="Tags Screenshot" width="300">
      </td>
    </tr>
  </table>
</div>

## ✨ Features

- 🔍 **Search Music**: Search for songs, artists, and albums using the Spotify API
- ⭐ **Rate Songs**: Rate your favorite tracks from 1 to 10
- 💾 **Save Offline**: Save songs to your personal library for offline access
- 🏷️ **Tags System**: Create custom tags to organize your music collection
- 📊 **Rating History**: Track your rating history across all songs
- 🎯 **Multi-API Ready**: Built to support multiple music APIs (Spotify or Deezer)

## 🚀 Getting Started

### Prerequisites

- Node.js (14 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MusicNexus.git
   cd MusicNexus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
4. **Configure your Firebase credentials in the `.env` file**

5. **Start the development server**
   ```bash
   npx expo start
   ```

## ⚙️ Environment Variables

Copy the `.env.example` file to `.env` and configure the following variables:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

EXPO_PUBLIC_TIDAL_CLIENT_ID=your_tidal_client_id
EXPO_PUBLIC_TIDAL_CLIENT_SECRET=your_tidal_client_secret
EXPO_PUBLIC_TIDAL_REDIRECT_URI=musicnexus://tidal-auth
```

> ⚠️ **WARNING:**  
> If you set `EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET` here, it will be embedded in your app bundle.  
> Anyone with access to your APK or JS bundle can extract this secret.  
> DO NOT use this in production or share your APK if you care about keeping your Spotify secret safe.  
> For real security, use a backend server to handle the Spotify secret and never expose it in your app code.

TIDAL catalog search uses the client-credentials flow. User account access is not implemented yet; when added, it should use TIDAL OAuth 2.1 Authorization Code + PKCE with the configured `musicnexus://tidal-auth` redirect URI.

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Music API**: TIDAL, Spotify, and Deezer APIs (with support for future APIs)
- **Navigation**: React Navigation
- **State Management**: React Hooks

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📱 Screens

### 📚 Library Screen
- View your saved music collection
- Edit ratings and manage tags
- Filter and sort your music

### 🔍 Search Screen
- Search for music using Spotify or Deezer API
- View song details (title, artist, album, duration)
- Rate and save songs to your library

### 🏷️ Tags Management
- Create custom tags with colors
- Organize your music collection
- Filter music by tags

### 📊 Rating History
- View your complete rating history
- Track rating changes over time
- Statistics and insights

### 👤 Profile & Stats
- View profile information and personal notes
- See statistics: total songs, albums, artists, average rating
- Breakdown by ratings, years, and tags
- Delete all songs or tags from your account

## 🔧 Development

### Running the App
```bash
npx expo start
```

### Building for Production
```bash
npx expo build --platform android
npx expo build --platform ios
```

### Preview Builds
```bash
npx expo install expo-dev-client
npx expo run:android
npx expo run:ios
```

## 📄 License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).  
You may use and modify it freely for **non-commercial purposes**, as long as you give proper credit.

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) for backend services
- [Expo](https://expo.dev/) for the amazing development platform

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ by Matheus Cerqueira Santana
