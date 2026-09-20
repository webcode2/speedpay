import '../api/api_client.dart';
import 'session_store.dart';

class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.status,
  });

  final String id;
  final String email;
  final String status;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      status: json['status'] as String,
    );
  }
}

class AuthRepository {
  AuthRepository({
    required ApiClient api,
    required SessionStore sessionStore,
  })  : _api = api,
        _sessionStore = sessionStore;

  final ApiClient _api;
  final SessionStore _sessionStore;

  Future<AuthUser> register({
    required String email,
    required String password,
    String? phone,
  }) async {
    final data = await _api.post(
      '/api/auth/register',
      body: {
        'email': email,
        'password': password,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      },
    );
    await _sessionStore.writeToken(data['token'] as String);
    return AuthUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final data = await _api.post(
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    await _sessionStore.writeToken(data['token'] as String);
    return AuthUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<void> logout() async {
    try {
      await _api.post('/api/auth/logout', auth: true);
    } finally {
      await _sessionStore.clear();
    }
  }

  Future<AuthUser> me() async {
    final data = await _api.get('/api/auth/me', auth: true);
    return AuthUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<String?> forgotPassword(String email) async {
    final data = await _api.post(
      '/api/auth/forgot-password',
      body: {'email': email},
    );
    return data['resetToken'] as String?;
  }

  Future<void> resetPassword({
    required String token,
    required String password,
  }) async {
    await _api.post(
      '/api/auth/reset-password',
      body: {'token': token, 'password': password},
    );
  }
}
