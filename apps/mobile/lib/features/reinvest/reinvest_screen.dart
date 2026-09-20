import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class ReinvestScreen extends StatefulWidget {
  const ReinvestScreen({super.key, required this.parentInvestmentId});

  final String parentInvestmentId;

  @override
  State<ReinvestScreen> createState() => _ReinvestScreenState();
}

class _ReinvestScreenState extends State<ReinvestScreen> {
  Map<String, dynamic>? _preview;
  List<Map<String, dynamic>> _packages = [];
  String? _packageId;
  final _lots = TextEditingController(text: '1');
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
    _lots.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final previewData = await context.read<ApiClient>().get(
        '/api/reinvestments/preview?parentInvestmentId=${widget.parentInvestmentId}',
        auth: true,
      );
      final pkgData = await context.read<ApiClient>().get('/api/marketplace/packages', auth: true);
      final items = (pkgData['items'] as List?) ?? [];
      final packages = items
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .where((p) => p['status'] == 'OPEN')
          .toList();
      setState(() {
        _preview =
            Map<String, dynamic>.from(previewData['preview'] as Map);
        _packages = packages;
        _packageId = packages.isNotEmpty ? packages.first['id'] as String : null;
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
    final lotCount = int.tryParse(_lots.text.trim());
    if (lotCount == null || _packageId == null) {
      setState(() => _error = 'Package and lot count required');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _message = null;
    });
    try {
      final key = 'ri-${DateTime.now().millisecondsSinceEpoch}';
      final data = await context.read<ApiClient>().post(
        '/api/reinvestments',
        auth: true,
        body: {
          'parentInvestmentId': widget.parentInvestmentId,
          'packageId': _packageId,
          'lotCount': lotCount,
          'idempotencyKey': key,
        },
      );
      final inv = data['investment'] as Map?;
      setState(() {
        _message =
            'Reinvested into ${inv?['id'] ?? 'new investment'} · amount ${data['reinvestment']?['amount']}';
      });
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    return Scaffold(
      appBar: AppBar(title: const Text('Reinvest')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (_message != null)
                  Text(_message!, style: const TextStyle(color: Colors.green)),
                if (preview != null) ...[
                  Text('Maturity value: ${preview['maturityValue']}'),
                  Text('Already reinvested: ${preview['alreadyReinvested']}'),
                  Text(
                    'Remaining: ${preview['remaining']}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text('Status: ${preview['status']}'),
                  const SizedBox(height: 16),
                ],
                if (preview?['canReinvest'] != true)
                  const Text('Nothing left to reinvest from this investment.')
                else ...[
                  DropdownButton<String>(
                    isExpanded: true,
                    value: _packageId,
                    hint: const Text('Select package'),
                    items: _packages
                        .map(
                          (p) => DropdownMenuItem(
                            value: p['id'] as String,
                            child: Text(
                              '${p['name']} · ${p['lotPrice']} / lot',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _packageId = v),
                  ),
                  TextField(
                    controller: _lots,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Lots'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting ? 'Submitting…' : 'Confirm reinvest'),
                  ),
                ],
              ],
            ),
    );
  }
}
