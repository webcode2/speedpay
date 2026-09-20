import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class WithdrawalsScreen extends StatefulWidget {
  const WithdrawalsScreen({super.key});

  @override
  State<WithdrawalsScreen> createState() => _WithdrawalsScreenState();
}

class _WithdrawalsScreenState extends State<WithdrawalsScreen> {
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _accounts = [];
  final _amount = TextEditingController();
  final _pin = TextEditingController();
  String? _accountId;
  String? _error;
  String? _message;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amount.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final w = await context.read<ApiClient>().get('/api/withdrawals', auth: true);
      final p = await context.read<ApiClient>().get('/api/payout-accounts', auth: true);
      final items = (w['items'] as List?) ?? [];
      final accounts = (p['items'] as List?) ?? [];
      final verified = accounts
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .where((a) => a['status'] == 'VERIFIED')
          .toList();
      setState(() {
        _items = items
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _accounts = verified;
        _accountId = verified.isNotEmpty
            ? (verified.firstWhere(
                (a) => a['isDefault'] == true,
                orElse: () => verified.first,
              )['id'] as String?)
            : null;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amount.text.trim());
    if (amount == null || _accountId == null || _pin.text.isEmpty) {
      setState(() => _error = 'Amount, account, and PIN are required');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _message = null;
    });
    try {
      final key = 'wd-${DateTime.now().millisecondsSinceEpoch}';
      await context.read<ApiClient>().post(
        '/api/withdrawals',
        auth: true,
        body: {
          'amount': amount,
          'payoutAccountId': _accountId,
          'pin': _pin.text.trim(),
          'idempotencyKey': key,
        },
      );
      _amount.clear();
      _pin.clear();
      setState(() => _message = 'Withdrawal submitted');
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await context.read<ApiClient>().post('/api/withdrawals/$id/cancel', auth: true);
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Withdraw'),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.of(context).pushNamed('/withdrawals/pin'),
            child: const Text('PIN'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (_message != null)
                    Text(_message!, style: const TextStyle(color: Colors.green)),
                  Text('New withdrawal',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (_accounts.isEmpty)
                    const Text(
                      'Add and verify a payout account before withdrawing.',
                    )
                  else ...[
                    DropdownButton<String>(
                      isExpanded: true,
                      value: _accountId,
                      items: _accounts
                          .map(
                            (a) => DropdownMenuItem(
                              value: a['id'] as String,
                              child: Text(
                                '${a['bankName']} · ${a['accountNumberMasked']}',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _accountId = v),
                      hint: const Text('Payout account'),
                    ),
                    TextField(
                      controller: _amount,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Amount (minor units)',
                      ),
                    ),
                    TextField(
                      controller: _pin,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Withdrawal PIN',
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Submitting…' : 'Submit'),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Text('History',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (_items.isEmpty) const Text('No withdrawals yet.'),
                  ..._items.map((item) {
                    return ListTile(
                      title: Text(
                        '${item['amount']} ${item['currency']} · ${item['status']}',
                      ),
                      subtitle: Text('${item['createdAt']}'),
                      trailing: item['status'] == 'PENDING'
                          ? TextButton(
                              onPressed: () =>
                                  _cancel(item['id'] as String),
                              child: const Text('Cancel'),
                            )
                          : null,
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
