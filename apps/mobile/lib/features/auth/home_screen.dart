import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AuthUser? _user;
  String? _error;
  bool _loading = true;
  int? _available;
  int? _pending;
  int _activeInvestments = 0;
  num _accruedReturn = 0;
  int _unread = 0;
  bool _needsOnboarding = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final user = await context.read<AuthRepository>().me();
      final results = await Future.wait([
        api.get('/api/wallet', auth: true),
        api.get('/api/investments', auth: true),
        api.get('/api/returns', auth: true),
        api.get('/api/notifications', auth: true),
        api.get('/api/verification', auth: true),
        api.get('/api/payout-accounts', auth: true),
      ]);
      final walletData = results[0];
      final investments = results[1];
      final returnsData = results[2];
      final notifications = results[3];
      final verification = results[4];
      final payouts = results[5];

      final wallet = walletData['wallet'] is Map
          ? Map<String, dynamic>.from(walletData['wallet'] as Map)
          : walletData;
      final returns = returnsData['returns'] is Map
          ? Map<String, dynamic>.from(returnsData['returns'] as Map)
          : returnsData;
      final invItems = (investments['items'] as List?) ?? [];
      final active = invItems
          .where((e) => (e as Map)['status'] == 'ACTIVE')
          .length;
      final payoutItems = (payouts['items'] as List?) ?? [];
      final kycStatus = verification['status'] as String? ?? 'NOT_STARTED';
      final needsOnboarding = kycStatus != 'APPROVED' || payoutItems.isEmpty;

      if (!mounted) return;
      setState(() {
        _user = user;
        _available = (wallet['availableBalance'] as num?)?.toInt();
        _pending = (wallet['pendingBalance'] as num?)?.toInt();
        _activeInvestments = active;
        final totals = returns['totals'];
        _accruedReturn = totals is Map
            ? ((totals['accruedReturn'] as num?) ?? 0)
            : ((returns['accruedReturn'] as num?) ?? 0);
        _unread = (notifications['unreadCount'] as num?)?.toInt() ?? 0;
        _needsOnboarding = needsOnboarding;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
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
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Security',
            onPressed: () => Navigator.of(context).pushNamed('/security'),
            icon: const Icon(Icons.security),
          ),
          TextButton(onPressed: _logout, child: const Text('Sign out')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_user != null) ...[
              Text(
                'Hi ${_user!.email}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                'Status: ${_user!.status}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (_needsOnboarding) ...[
                const SizedBox(height: 12),
                Card(
                  color: Colors.amber.shade50,
                  child: ListTile(
                    title: const Text('Finish setup'),
                    subtitle: const Text(
                      'Complete profile, verification, and a payout account.',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        Navigator.of(context).pushNamed('/onboarding'),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _StatCard(
                    label: 'Available',
                    value: '${_available ?? 0}',
                  ),
                  _StatCard(
                    label: 'Pending',
                    value: '${_pending ?? 0}',
                  ),
                  _StatCard(
                    label: 'Active lots',
                    value: '$_activeInvestments',
                  ),
                  _StatCard(
                    label: 'Accrued',
                    value: '$_accruedReturn',
                  ),
                  _StatCard(
                    label: 'Unread',
                    value: '$_unread',
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Quick links', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _LinkChip('Packages', '/marketplace'),
                  _LinkChip('Portfolio', '/portfolio'),
                  _LinkChip('Returns', '/returns'),
                  _LinkChip('Wallet', '/wallet'),
                  _LinkChip('Deposit', '/wallet/deposit'),
                  _LinkChip('Withdraw', '/withdrawals'),
                  _LinkChip('Maturity', '/maturity'),
                  _LinkChip('Notifications', '/notifications'),
                  _LinkChip('Profile', '/profile'),
                  _LinkChip('Verification', '/verification'),
                  _LinkChip('Payouts', '/payout-accounts'),
                  _LinkChip('Security', '/security'),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 4),
              Text(value, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
      ),
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip(this.label, this.route);
  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: () => Navigator.of(context).pushNamed(route),
    );
  }
}
