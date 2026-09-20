import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
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
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<ApiClient>().get('/api/marketplace/packages', auth: true);
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
      appBar: AppBar(title: const Text('Packages')),
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
                    const Text('No open packages right now.'),
                  ..._items.map((item) {
                    return Card(
                      child: ListTile(
                        title: Text(item['name'] as String? ?? ''),
                        subtitle: Text(
                          '${item['projectName']} · ${item['lotPrice']}/lot · '
                          '${item['availableLots']} available · '
                          '${item['returnRate']}% · ${item['durationDays']}d',
                        ),
                        isThreeLine: true,
                        onTap: () => Navigator.of(context).pushNamed(
                          '/marketplace/package',
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
