import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth/auth_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AuthUser? _user;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final user = await context.read<AuthRepository>().me();
      setState(() => _user = user);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _logout() async {
    await context.read<AuthRepository>().logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Solar Investment'),
        actions: [
          TextButton(onPressed: _logout, child: const Text('Sign out')),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _error != null
            ? Text(_error!, style: const TextStyle(color: Colors.red))
            : _user == null
                ? const CircularProgressIndicator()
                : Text(
                    'Signed in as ${_user!.email}',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
      ),
    );
  }
}
