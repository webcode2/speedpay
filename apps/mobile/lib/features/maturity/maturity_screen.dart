import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class MaturityScreen extends StatefulWidget {
  const MaturityScreen({super.key});

  @override
  State<MaturityScreen> createState() => _MaturityScreenState();
}

class _MaturityScreenState extends State<MaturityScreen> {
  List<Map<String, dynamic>> _eligible = [];
  List<Map<String, dynamic>> _processed = [];
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
      final data = await _client().get('/api/maturities', auth: true);
      final eligible = (data['eligible'] as List?) ?? [];
      final processed = (data['processed'] as List?) ?? [];
      setState(() {
        _eligible = eligible
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _processed = processed
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
    return Scaffold(
      appBar: AppBar(title: const Text('Maturity')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  Text(
                    'Eligible (awaiting staff processing)',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (_eligible.isEmpty)
                    const Text('No investments due for maturity.'),
                  ..._eligible.map((item) {
                    return Card(
                      child: ListTile(
                        title: Text(item['packageName'] as String? ?? ''),
                        subtitle: Text(
                          '${item['projectName']} · value ${item['maturityValue']} · '
                          'due ${item['maturityAt']}',
                        ),
                        isThreeLine: true,
                        onTap: () => Navigator.of(context).pushNamed(
                          '/portfolio/investment',
                          arguments: item['id'],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 24),
                  Text(
                    'Processed',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (_processed.isEmpty)
                    const Text('No processed maturities yet.'),
                  ..._processed.map((item) {
                    return ListTile(
                      title: Text(item['packageName'] as String? ?? ''),
                      subtitle: Text(
                        'Credited ${item['maturityValue']} · ${item['processedAt']}',
                      ),
                      onTap: () => Navigator.of(context).pushNamed(
                        '/portfolio/investment',
                        arguments: item['id'],
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
