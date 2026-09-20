import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class PayoutAccountsScreen extends StatefulWidget {
  const PayoutAccountsScreen({super.key});

  @override
  State<PayoutAccountsScreen> createState() => _PayoutAccountsScreenState();
}

class _PayoutAccountsScreenState extends State<PayoutAccountsScreen> {
  List<Map<String, dynamic>> _items = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final data = await context.read<ApiClient>().get('/api/payout-accounts', auth: true);
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

  Future<void> _showForm({Map<String, dynamic>? existing}) async {
    final bank = TextEditingController(text: existing?['bankName'] as String? ?? '');
    final number =
        TextEditingController(text: '');
    final name =
        TextEditingController(text: existing?['accountName'] as String? ?? '');
    final isEdit = existing != null;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isEdit ? 'Edit account' : 'Add account'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: bank,
                decoration: const InputDecoration(labelText: 'Bank name'),
              ),
              TextField(
                controller: number,
                decoration: InputDecoration(
                  labelText: isEdit
                      ? 'Account number (re-enter full)'
                      : 'Account number',
                ),
              ),
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Account name'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (saved != true) return;

    try {
      final body = {
        'bankName': bank.text.trim(),
        'accountNumber': number.text.trim(),
        'accountName': name.text.trim(),
      };
      if (isEdit) {
        await context.read<ApiClient>().patch(
          '/api/payout-accounts/${existing['id']}',
          auth: true,
          body: body,
        );
      } else {
        await context.read<ApiClient>().post('/api/payout-accounts', auth: true, body: body);
      }
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _setDefault(String id) async {
    try {
      await context.read<ApiClient>().post('/api/payout-accounts/$id/default', auth: true);
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _remove(String id) async {
    try {
      await context.read<ApiClient>().delete('/api/payout-accounts/$id', auth: true);
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payout accounts'),
        actions: [
          IconButton(
            onPressed: () => _showForm(),
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_error!, style: const TextStyle(color: Colors.red)),
                    ),
                  if (_items.isEmpty)
                    const Text('No payout accounts yet.'),
                  ..._items.map((item) {
                    final id = item['id'] as String;
                    final status = item['status'] as String? ?? '';
                    final isDefault = item['isDefault'] == true;
                    final rejection = item['rejectionReason'] as String?;
                    return Card(
                      child: ListTile(
                        title: Text(
                          '${item['bankName']} · ${item['accountName']}',
                        ),
                        subtitle: Text(
                          [
                            item['accountNumberMasked'],
                            status,
                            if (isDefault) 'Default',
                            if (rejection != null && rejection.isNotEmpty)
                              'Reason: $rejection',
                          ].join(' · '),
                        ),
                        isThreeLine: true,
                        trailing: PopupMenuButton<String>(
                          onSelected: (value) {
                            if (value == 'default') {
                              _setDefault(id);
                            } else if (value == 'edit') {
                              _showForm(existing: item);
                            } else if (value == 'remove') {
                              _remove(id);
                            }
                          },
                          itemBuilder: (_) => const [
                            PopupMenuItem(value: 'default', child: Text('Set default')),
                            PopupMenuItem(value: 'edit', child: Text('Edit')),
                            PopupMenuItem(value: 'remove', child: Text('Remove')),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
