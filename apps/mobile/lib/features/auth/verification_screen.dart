import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  String _status = 'NOT_STARTED';
  List<dynamic> _documents = [];
  String? _error;
  String? _message;
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
    try {
      final data = await _client().get('/api/verification', auth: true);
      setState(() {
        _status = data['status'] as String? ?? 'NOT_STARTED';
        _documents = (data['documents'] as List?) ?? [];
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
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await _client().post('/api/verification', auth: true, body: {});
      setState(() => _message = 'Submitted for review');
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Verification')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: ListView(
          children: [
            Text('Status: $_status'),
            const SizedBox(height: 12),
            Text('Documents: ${_documents.length}'),
            const SizedBox(height: 8),
            const Text(
              'Upload ID_FRONT and SELFIE on the web app, then submit here for review.',
              style: TextStyle(fontSize: 13),
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_message != null) Text(_message!),
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Submit for review')),
            TextButton(
              onPressed: () => Navigator.of(context).pushNamed('/profile'),
              child: const Text('Edit profile'),
            ),
          ],
        ),
      ),
    );
  }
}
