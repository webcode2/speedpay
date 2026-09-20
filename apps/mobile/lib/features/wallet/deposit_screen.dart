import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final _amount = TextEditingController();
  List<Map<String, dynamic>> _items = [];
  String? _error;
  String? _message;
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

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _client().get('/api/deposits', auth: true);
      final items = (data['items'] as List?) ?? [];
      setState(() {
        _items = items
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

  Future<void> _create() async {
    setState(() {
      _error = null;
      _message = null;
    });
    final amount = int.tryParse(_amount.text.trim());
    if (amount == null) {
      setState(() => _error = 'Enter amount in minor units (integer)');
      return;
    }
    try {
      final data = await _client().post(
        '/api/deposits',
        auth: true,
        body: {'amount': amount},
      );
      final payment = data['payment'] as Map?;
      setState(() {
        _message = payment?['instructions'] as String? ?? 'Deposit created';
      });
      _amount.clear();
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _verify(String id) async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      final data = await _client().post('/api/deposits/$id/verify', auth: true);
      final credited = data['credited'] == true;
      final already = data['alreadyComplete'] == true;
      setState(() {
        _message = already
            ? 'Already completed'
            : credited
                ? 'Deposit credited to wallet'
                : 'Updated';
      });
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Deposit')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                TextField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Amount (minor units, e.g. 100000 = ₦1,000)',
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton(onPressed: _create, child: const Text('Start deposit')),
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (_message != null) Text(_message!),
                const SizedBox(height: 24),
                Text('History', style: Theme.of(context).textTheme.titleLarge),
                ..._items.map((d) {
                  final id = d['id'] as String;
                  final status = d['status'] as String? ?? '';
                  final canVerify =
                      status == 'PENDING' || status == 'PROCESSING';
                  return ListTile(
                    title: Text('${d['amount']} ${d['currency']}'),
                    subtitle: Text(status),
                    trailing: canVerify
                        ? TextButton(
                            onPressed: () => _verify(id),
                            child: const Text('Verify'),
                          )
                        : null,
                  );
                }),
              ],
            ),
    );
  }
}
