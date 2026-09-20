import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Map<String, dynamic>? _wallet;
  List<Map<String, dynamic>> _txs = [];
  String? _error;
  bool _loading = true;

  ApiClient _client() {
    final store = context.read<SessionStore>();
    return ApiClient(baseUrl: defaultApiBaseUrl(), getToken: store.readToken);
  }

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
      final walletData = await _client().get('/api/wallet', auth: true);
      final txData = await _client().get('/api/wallet/transactions', auth: true);
      final items = (txData['items'] as List?) ?? [];
      setState(() {
        _wallet = Map<String, dynamic>.from(walletData['wallet'] as Map);
        _txs = items
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  String _fmt(dynamic v) {
    if (v == null) return '0';
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (_wallet != null) ...[
                    Text(
                      'Available (${_wallet!['currency']})',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      _fmt(_wallet!['availableBalance']),
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text('Pending: ${_fmt(_wallet!['pendingBalance'])}'),
                    const SizedBox(height: 8),
                    const Text(
                      'Balances are in minor units (e.g. kobo).',
                      style: TextStyle(fontSize: 12, color: Colors.black54),
                    ),
                  ],
                  FilledButton(
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/wallet/deposit'),
                    child: const Text('Deposit'),
                  ),
                  FilledButton(
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/withdrawals'),
                    child: const Text('Withdraw'),
                  ),
                  const SizedBox(height: 24),
                  Text('Transactions', style: Theme.of(context).textTheme.titleLarge),
                  if (_txs.isEmpty) const Text('No transactions yet.'),
                  ..._txs.map((tx) {
                    return ListTile(
                      title: Text('${tx['type']} · ${tx['direction']}'),
                      subtitle: Text('${tx['status']} · ${_fmt(tx['amount'])}'),
                      onTap: () => Navigator.of(context).pushNamed(
                        '/wallet/transaction',
                        arguments: tx['id'],
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
