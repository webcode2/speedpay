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
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Signed in as ${_user!.email}',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/marketplace'),
                        child: const Text('Browse packages'),
                      ),
                      FilledButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/portfolio'),
                        child: const Text('My investments'),
                      ),
                      FilledButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/returns'),
                        child: const Text('Returns'),
                      ),
                      FilledButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/wallet'),
                        child: const Text('Wallet'),
                      ),
                      TextButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/wallet/deposit'),
                        child: const Text('Deposit'),
                      ),
                      TextButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/profile'),
                        child: const Text('Profile'),
                      ),
                      TextButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/verification'),
                        child: const Text('Verification'),
                      ),
                      TextButton(
                        onPressed: () =>
                            Navigator.of(context).pushNamed('/payout-accounts'),
                        child: const Text('Payout accounts'),
                      ),
                    ],
                  ),
      ),
    );
  }
}
