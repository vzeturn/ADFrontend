# AD Management System

Simple and secure Active Directory management system with session-based authentication.

## 🌟 Features

- 🔐 **Secure Login**: AD credential validation with session management
- 👤 **User Profile**: View personal information from Active Directory
- 🔑 **Password Management**: Self-service password change
- 📊 **Account Status**: Check account and session information
- 🎨 **Modern UI**: Clean, responsive Bootstrap interface
- 🛡️ **Session Security**: Encrypted password storage in memory
- ⏱️ **Session Management**: Automatic timeout and refresh

## 📁 Project Structure

```
ADManagementSystem/
├── Backend/ADManagement.API/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   └── UserController.cs
│   ├── Services/
│   │   ├── IActiveDirectoryService.cs
│   │   ├── ActiveDirectoryService.cs
│   │   ├── ISessionService.cs
│   │   ├── SessionService.cs
│   │   ├── IAuthService.cs
│   │   └── AuthService.cs
│   ├── Models/
│   │   ├── DTOs/
│   │   ├── Entities/
│   │   └── Responses/
│   ├── Configuration/
│   ├── Middleware/
│   ├── appsettings.json
│   └── Program.cs
├── Frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── style.css
│   ├── src/
│   │   ├── services/api.js
│   │   ├── utils/auth.js
│   │   └── app.js
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- .NET 7 SDK
- Node.js (for frontend)
- Access to Active Directory Domain

### Setup

1. **Clone/Create Project Structure**
   ```bash
   mkdir ADManagementSystem
   cd ADManagementSystem
   ```

2. **Backend Setup**
   ```bash
   # Create backend project
   mkdir -p Backend/ADManagement.API
   cd Backend/ADManagement.API
   dotnet new webapi
   
   # Install required packages
   dotnet add package System.DirectoryServices
   dotnet add package System.DirectoryServices.AccountManagement
   dotnet add package Microsoft.Extensions.Caching.Memory
   
   # Copy all backend files from artifacts
   # (Copy all .cs files to their respective folders)
   ```

3. **Frontend Setup**
   ```bash
   # Go to frontend folder
   cd ../../Frontend
   
   # Install dependencies
   npm install
   
   # Copy all frontend files from artifacts
   # (Copy HTML, CSS, JS files)
   ```

4. **Configure Active Directory**
   ```bash
   # Edit Backend/ADManagement.API/appsettings.json
   {
     "ActiveDirectory": {
       "Domain": "your-company.local",
       "AdminUsername": "",
       "AdminPassword": ""
     }
   }
   ```

## 🔧 Development

### Start Backend
```bash
cd Backend/ADManagement.API
dotnet run --urls "https://localhost:7001;http://localhost:5001"
```

### Start Frontend
```bash
cd Frontend
npm run dev
```

### Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: https://localhost:7001
- **Swagger**: https://localhost:7001/swagger

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/validate` - Validate session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh session
- `GET /api/auth/session-info` - Get session info

### User Management
- `GET /api/user/profile` - Get user profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/account-status` - Get account status
- `GET /api/user/test-ad-connection` - Test AD connection

## ⚙️ Configuration

### Backend Configuration (appsettings.json)
```json
{
  "ActiveDirectory": {
    "Domain": "your-domain.local",
    "AdminUsername": "",
    "AdminPassword": ""
  },
  "Session": {
    "TimeoutMinutes": 30,
    "SlidingExpirationMinutes": 15,
    "CleanupIntervalMinutes": 5
  }
}
```

### Frontend Configuration
- Backend URL: `https://localhost:7001/api` (in api.js)
- Session storage: localStorage
- Auto-refresh session timer

## 🛡️ Security Features

### Session Management
- ✅ Session-based authentication
- ✅ Password encryption in memory
- ✅ Session timeout (30 minutes default)
- ✅ Sliding expiration (15 minutes default)
- ✅ Session cleanup

### Request Security
- ✅ CORS protection
- ✅ Input validation
- ✅ Error handling
- ✅ Session validation middleware

### Password Security
- ✅ Complexity validation
- ✅ Secure storage during session
- ✅ AD integration for password changes

## 🔄 Workflow

1. **User Login**
   - User enters AD credentials
   - Backend validates with AD
   - Session created with encrypted password
   - Frontend receives session token

2. **Authenticated Requests**
   - Frontend sends session ID in headers
   - Backend validates session
   - Uses stored credentials for AD operations
   - No re-authentication required

3. **Session Management**
   - Automatic session refresh
   - Session timeout warnings
   - Graceful logout

## 🐛 Troubleshooting

### Common Issues

**Cannot connect to AD**
- Check domain name in appsettings.json
- Ensure server can reach domain controller
- Verify network connectivity

**CORS errors**
- Check frontend URL in backend CORS settings
- Ensure both servers are running on correct ports

**Session expires quickly**
- Adjust session timeout in configuration
- Check for network connectivity issues

### Debug Tips
- Check browser console for frontend errors
- Check backend logs for API errors
- Use Swagger UI for API testing
- Monitor session storage in browser dev tools

## 📚 File Guide

### Essential Files to Copy from Artifacts

**Backend Core Files:**
1. `Program.cs` - Application startup
2. `ADManagement.API.csproj` - Project file
3. `appsettings.json` - Configuration

**Controllers:**
4. `Controllers/AuthController.cs` - Authentication endpoints
5. `Controllers/UserController.cs` - User management endpoints

**Services:**
6. `Services/IActiveDirectoryService.cs` + `ActiveDirectoryService.cs`
7. `Services/ISessionService.cs` + `SessionService.cs`
8. `Services/IAuthService.cs` + `AuthService.cs`

**Models:**
9. All DTOs in `Models/DTOs/`
10. `Models/Entities/UserSession.cs`
11. `Models/Responses/ApiResponse.cs`

**Configuration & Middleware:**
12. `Configuration/` folder files
13. `Middleware/SessionAuthMiddleware.cs`

**Frontend Files:**
14. `Frontend/public/index.html` - Main HTML
15. `Frontend/public/style.css` - Styles
16. `Frontend/src/services/api.js` - API service
17. `Frontend/src/utils/auth.js` - Auth utilities
18. `Frontend/src/app.js` - Main application
19. `Frontend/package.json` - Dependencies

## 📜 License

Internal use only - Company confidential

## 👥 Support

For issues or questions, please contact the development team.