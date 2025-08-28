# SarmayaGhar - Tech Stack and Architecture

## Selected Tech Stack

Based on the requirements specified in the project documentation and the UI/UX design from Figma, the following tech stack has been selected:

### Frontend
- **React.js**: For building the user interface components
- **Tailwind CSS**: For styling and responsive design
- **Leaflet.js**: For interactive maps and heatmap visualizations
- **Chart.js/Recharts**: For data visualization and analytics dashboards
- **Axios**: For API communication

### Backend
- **Django**: For main application backend, user authentication, and portfolio management
- **FastAPI**: For ML model serving and real-time predictions
- **PostgreSQL**: For database management with PostGIS extension for geospatial data
- **Redis**: For caching and improving performance

### Machine Learning
- **Python**: Core language for ML model development
- **Scikit-learn**: For regression models and basic ML algorithms
- **TensorFlow/PyTorch**: For advanced ML models and neural networks
- **Pandas/NumPy**: For data manipulation and analysis
- **GeoPandas**: For geospatial data analysis
- **NLTK/Transformers**: For NLP in the AI chatbot module

### APIs and Services
- **Google Maps API**: For location-based services and mapping
- **Kaggle API**: For accessing open-source datasets

### DevOps
- **Docker**: For containerization and consistent development/deployment
- **GitHub Actions**: For CI/CD pipeline

## Architecture Overview

The SarmayaGhar application will follow a modular, microservices-oriented architecture to ensure scalability, maintainability, and separation of concerns.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (React.js)                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API Gateway (Django)                           │
└───────┬───────────────────────┬────────────────────────┬────────────┘
        │                       │                        │
        ▼                       ▼                        ▼
┌───────────────┐      ┌────────────────┐      ┌─────────────────────┐
│ Authentication│      │ Core Services  │      │ ML Services         │
│ & User        │      │ (Django)       │      │ (FastAPI)           │
│ Management    │      │                │      │                     │
└───────┬───────┘      └────────┬───────┘      └──────────┬──────────┘
        │                       │                         │
        │                       │                         │
        ▼                       ▼                         ▼
┌───────────────┐      ┌────────────────┐      ┌─────────────────────┐
│ User Database │      │ Property &     │      │ ML Models           │
│ (PostgreSQL)  │      │ Portfolio DB   │      │ (Model Storage)     │
│               │      │ (PostgreSQL)   │      │                     │
└───────────────┘      └────────────────┘      └─────────────────────┘
```

## Module Architecture

### 1. AI-Powered Property Valuation Module
- **Components**: Data ingestion pipeline, feature engineering service, prediction model API
- **Tech**: FastAPI, Scikit-learn, PostgreSQL
- **Integration**: Exposes REST API endpoints for property valuation

### 2. Rental Yield Estimation & ROI Module
- **Components**: Rental data analyzer, yield prediction service, ROI calculator
- **Tech**: FastAPI, Scikit-learn/TensorFlow, PostgreSQL
- **Integration**: Exposes REST API endpoints for yield and ROI calculations

### 3. Interactive Heatmap Module
- **Components**: Geospatial data processor, heatmap generator, proximity analyzer
- **Tech**: Django, GeoPandas, Leaflet.js, PostGIS
- **Integration**: Provides geospatial data through REST API for frontend visualization

### 4. Portfolio Management Module
- **Components**: Portfolio tracker, performance analyzer, optimization engine
- **Tech**: Django, PostgreSQL, Chart.js
- **Integration**: Full CRUD operations through REST API

### 5. Market Crash & Boom Prediction Module
- **Components**: Economic indicator analyzer, trend predictor, alert system
- **Tech**: FastAPI, TensorFlow/PyTorch, time series analysis libraries
- **Integration**: Scheduled predictions and REST API for trend data

### 6. AI Chatbot Module
- **Components**: Query processor, NLP engine, response generator
- **Tech**: FastAPI, NLTK/Transformers, Redis for caching
- **Integration**: WebSocket for real-time chat functionality

## Data Flow

1. **User Authentication Flow**:
   - User registers/logs in through React frontend
   - Django authentication service validates credentials
   - JWT token issued for subsequent API calls

2. **Property Valuation Flow**:
   - User inputs property details in React frontend
   - Request sent to Django API gateway
   - Request forwarded to FastAPI ML service
   - ML model processes data and returns prediction
   - Result displayed to user in React frontend

3. **Portfolio Management Flow**:
   - User adds properties to portfolio through React frontend
   - Data stored in PostgreSQL through Django API
   - Performance metrics calculated and stored
   - Dashboard displays portfolio data using Chart.js

4. **Heatmap Visualization Flow**:
   - Geospatial data processed by GeoPandas
   - Data served through Django API
   - Leaflet.js renders interactive heatmap in React frontend

## Deployment Strategy

The application will be deployed using a containerized approach:

1. **Development Environment**:
   - Local Docker containers for all services
   - Volume mounts for code changes without rebuilds

2. **Production Environment**:
   - Containerized deployment
   - Separate containers for each service
   - Load balancing for high availability

## Scalability Considerations

- Horizontal scaling of FastAPI services for ML model serving
- Database sharding for large datasets
- Caching layer with Redis for frequently accessed data
- Asynchronous processing for computationally intensive tasks

## Security Measures

- JWT authentication for API security
- HTTPS for all communications
- Database encryption for sensitive data
- Input validation and sanitization
- CSRF protection

## Future Expansion Support

The architecture is designed to support future enhancements mentioned in the project documentation:

1. **Blockchain Integration**:
   - Separate blockchain service can be added
   - Smart contract integration points defined in API gateway

2. **Mobile Application Development**:
   - Current API design supports mobile clients
   - Authentication flow compatible with mobile apps
