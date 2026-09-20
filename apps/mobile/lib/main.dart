import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/auth/auth_repository.dart';
import 'core/auth/session_store.dart';
import 'features/auth/forgot_password_screen.dart';
import 'features/auth/home_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/payout_accounts_screen.dart';
import 'features/auth/profile_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/auth/reset_password_screen.dart';
import 'features/auth/verification_screen.dart';
import 'features/marketplace/marketplace_screen.dart';
import 'features/marketplace/package_detail_screen.dart';

String defaultApiBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

void main() {
  final sessionStore = SessionStore();
  final api = ApiClient(
    baseUrl: defaultApiBaseUrl(),
    getToken: sessionStore.readToken,
  );
  final auth = AuthRepository(api: api, sessionStore: sessionStore);

  runApp(
    MultiProvider(
      providers: [
        Provider.value(value: sessionStore),
        Provider.value(value: auth),
      ],
      child: const SolarInvestmentApp(),
    ),
  );
}

class SolarInvestmentApp extends StatelessWidget {
  const SolarInvestmentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Solar Investment',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      routes: {
        '/': (_) => const AuthGate(),
        '/login': (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/forgot-password': (_) => const ForgotPasswordScreen(),
        '/reset-password': (_) => const ResetPasswordScreen(),
        '/home': (_) => const HomeScreen(),
        '/profile': (_) => const ProfileScreen(),
        '/verification': (_) => const VerificationScreen(),
        '/payout-accounts': (_) => const PayoutAccountsScreen(),
        '/marketplace': (_) => const MarketplaceScreen(),
        '/marketplace/package': (context) {
          final id = ModalRoute.of(context)?.settings.arguments as String?;
          if (id == null || id.isEmpty) {
            return const Scaffold(
              body: Center(child: Text('Missing package id')),
            );
          }
          return PackageDetailScreen(packageId: id);
        },
      },
      initialRoute: '/',
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final store = context.read<SessionStore>();
    final token = await store.readToken();
    if (!mounted) return;
    if (token == null || token.isEmpty) {
      Navigator.of(context).pushReplacementNamed('/login');
      return;
    }
    try {
      await context.read<AuthRepository>().me();
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (_) {
      await store.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
