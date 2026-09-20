import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class WalletTransactionScreen extends StatefulWidget {
  const WalletTransactionScreen({super.key, required this.transactionId});

  final String transactionId;

  @override
  State<WalletTransactionScreen> createState() =>
      _WalletTransactionScreenState();
}

class _WalletTransactionScreenState extends State<WalletTransactionScreen> {
  Map<String, dynamic>? _tx;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client =
        context.read<ApiClient>();
    try {
      final data = await client.get(
        '/api/wallet/transactions/${widget.transactionId}',
        auth: true,
      );
      setState(() {
        _tx = Map<String, dynamic>.from(data['transaction'] as Map);
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transaction')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: Colors.red))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Type: ${_tx!['type']}'),
                        Text('Status: ${_tx!['status']}'),
                        Text('Direction: ${_tx!['direction']}'),
                        Text('Amount: ${_tx!['amount']} ${_tx!['currency']}'),
                        Text('Created: ${_tx!['createdAt']}'),
                        if (_tx!['description'] != null)
                          Text('Description: ${_tx!['description']}'),
                      ],
                    ),
            ),
    );
  }
}
