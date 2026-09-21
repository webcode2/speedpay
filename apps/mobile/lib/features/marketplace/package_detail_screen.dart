import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class PackageDetailScreen extends StatefulWidget {
  const PackageDetailScreen({super.key, required this.packageId});

  final String packageId;

  @override
  State<PackageDetailScreen> createState() => _PackageDetailScreenState();
}

class _PackageDetailScreenState extends State<PackageDetailScreen> {
  Map<String, dynamic>? _pkg;
  final _lots = TextEditingController(text: '1');
  Map<String, dynamic>? _quote;
  String? _error;
  String? _message;
  bool _loading = true;
  bool _purchasing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _lots.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ApiClient>().get(
        '/api/marketplace/packages/${widget.packageId}',
        auth: true,
      );
      setState(() {
        _pkg = Map<String, dynamic>.from(data['package'] as Map);
        _lots.text = '${_pkg!['minimumLots'] ?? 1}';
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _quoteNow() async {
    setState(() {
      _error = null;
      _quote = null;
    });
    final count = int.tryParse(_lots.text.trim());
    if (count == null) {
      setState(() => _error = 'Enter a valid lot count');
      return;
    }
    try {
      final data = await context.read<ApiClient>().post(
        '/api/marketplace/packages/${widget.packageId}/quote',
        auth: true,
        body: {'lotCount': count},
      );
      setState(() {
        _quote = Map<String, dynamic>.from(data['quote'] as Map);
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _purchase() async {
    final count = int.tryParse(_lots.text.trim());
    if (count == null) {
      setState(() => _error = 'Enter a valid lot count');
      return;
    }
    setState(() {
      _purchasing = true;
      _error = null;
      _message = null;
    });
    try {
      final key =
          'purchase-${widget.packageId}-$count-${DateTime.now().millisecondsSinceEpoch}';
      final data = await context.read<ApiClient>().post(
        '/api/marketplace/packages/${widget.packageId}/purchase',
        auth: true,
        body: {'lotCount': count, 'idempotencyKey': key},
      );
      final investment = data['investment'] as Map?;
      setState(() {
        _message =
            'Purchase successful · investment ${investment?['id'] ?? ''}';
        _purchasing = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _purchasing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final pkg = _pkg;
    return Scaffold(
      appBar: AppBar(title: Text(pkg?['name'] as String? ?? 'Package')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (_message != null) Text(_message!),
          if (pkg != null) ...[
            Text(pkg['description'] as String? ?? '', style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 12),
            Text('Project: ${pkg['projectName']}'),
            Text('Lot price: ${pkg['lotPrice']}'),
            Text(
              (pkg['availableLots'] ?? 0) == 0
                  ? 'Slots: Sold out (${pkg['totalLots'] ?? 0} total)'
                  : 'Slots: ${pkg['availableLots']} remaining of ${pkg['totalLots'] ?? '—'}',
            ),
            Text('Return: ${pkg['returnType']} ${pkg['returnRate']}%'),
            Text('Duration: ${pkg['durationDays']} days'),
            const SizedBox(height: 16),
            if ((pkg['availableLots'] as num?)?.toInt() == 0)
              const Text(
                'This package is sold out.',
                style: TextStyle(fontWeight: FontWeight.w600),
              )
            else ...[
              TextField(
                controller: _lots,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Lots'),
              ),
              const SizedBox(height: 8),
              FilledButton(onPressed: _quoteNow, child: const Text('Get summary')),
            ],
          ],
          if (_quote != null && (pkg?['availableLots'] as num?)?.toInt() != 0) ...[
            const SizedBox(height: 24),
            Text('Investment summary', style: Theme.of(context).textTheme.titleLarge),
            Text('Principal: ${_quote!['principal']}'),
            Text('Expected return: ${_quote!['expectedReturn']}'),
            Text('Maturity value: ${_quote!['maturityValue']}'),
            Text('Maturity: ${_quote!['maturityAt']}'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _purchasing ? null : _purchase,
              child: Text(_purchasing ? 'Purchasing…' : 'Confirm purchase (wallet)'),
            ),
          ],
        ],
      ),
    );
  }
}
