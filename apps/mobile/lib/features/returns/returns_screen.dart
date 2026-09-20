import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class ReturnsScreen extends StatefulWidget {
  const ReturnsScreen({super.key});

  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> {
  Map<String, dynamic>? _totals;
  List<Map<String, dynamic>> _items = [];
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
      final data = await _client().get('/api/returns', auth: true);
      final returns = Map<String, dynamic>.from(data['returns'] as Map);
      final totals = Map<String, dynamic>.from(returns['totals'] as Map);
      final items = (returns['items'] as List?) ?? [];
      setState(() {
        _totals = totals;
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

  @override
  Widget build(BuildContext context) {
    final totals = _totals;
    return Scaffold(
      appBar: AppBar(title: const Text('Returns')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (totals != null) ...[
                    Text(
                      'Today',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      '${totals['todayReturn']}',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 12),
                    Text('Accrued: ${totals['accruedReturn']}'),
                    Text('Expected: ${totals['expectedReturn']}'),
                    Text('Maturity value: ${totals['maturityValue']}'),
                    Text('Current value: ${totals['currentValue']}'),
                    Text('Principal: ${totals['principal']}'),
                    const SizedBox(height: 24),
                    Text(
                      'By investment',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                  if (_items.isEmpty && _error == null)
                    const Text('No investments yet.'),
                  ..._items.map((item) {
                    return Card(
                      child: ListTile(
                        title: Text(item['packageName'] as String? ?? ''),
                        subtitle: Text(
                          'Accrued ${item['accruedReturn']} · '
                          'Today ${item['todayReturn']} · '
                          '${(item['percentageComplete'] as num?)?.toStringAsFixed(0) ?? '0'}%',
                        ),
                        isThreeLine: true,
                        onTap: () => Navigator.of(context).pushNamed(
                          '/portfolio/investment',
                          arguments: item['id'],
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
