import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({super.key});

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
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
      final data = await _client().get('/api/investments', auth: true);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My investments')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (_items.isEmpty && _error == null)
                    const Text('No investments yet.'),
                  ..._items.map((item) {
                    return Card(
                      child: ListTile(
                        title: Text(item['packageName'] as String? ?? ''),
                        subtitle: Text(
                          '${item['projectName']} · ${item['status']} · '
                          'principal ${item['principal']} · '
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
