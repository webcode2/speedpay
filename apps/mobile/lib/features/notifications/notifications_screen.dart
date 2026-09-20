import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  int _unread = 0;
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
      final data = await context.read<ApiClient>().get('/api/notifications', auth: true);
      final items = (data['items'] as List?) ?? [];
      setState(() {
        _items = items
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _unread = (data['unreadCount'] as num?)?.toInt() ?? 0;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await context.read<ApiClient>().post('/api/notifications/$id/read', auth: true);
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _markAll() async {
    try {
      await context.read<ApiClient>().post('/api/notifications/read-all', auth: true);
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_unread > 0 ? 'Notifications ($_unread)' : 'Notifications'),
        actions: [
          if (_unread > 0)
            TextButton(onPressed: _markAll, child: const Text('Read all')),
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
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (_items.isEmpty) const Text('No notifications yet.'),
                  ..._items.map((n) {
                    final unread = n['readAt'] == null;
                    return Card(
                      color: unread ? Colors.teal.withValues(alpha: 0.08) : null,
                      child: ListTile(
                        title: Text(
                          n['title'] as String? ?? '',
                          style: TextStyle(
                            fontWeight:
                                unread ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        subtitle: Text(
                          '${n['body']}\n${n['createdAt']}',
                        ),
                        isThreeLine: true,
                        onTap: unread
                            ? () => _markRead(n['id'] as String)
                            : null,
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
