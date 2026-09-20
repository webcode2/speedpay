import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session_store.dart';
import '../../main.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _dob = TextEditingController();
  final _country = TextEditingController();
  String? _status;
  String? _error;
  String? _message;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _dob.dispose();
    _country.dispose();
    super.dispose();
  }

  ApiClient _client() {
    final store = context.read<SessionStore>();
    return ApiClient(baseUrl: defaultApiBaseUrl(), getToken: store.readToken);
  }

  Future<void> _load() async {
    try {
      final data = await _client().get('/api/profile', auth: true);
      final profile = Map<String, dynamic>.from(data['profile'] as Map);
      final user = Map<String, dynamic>.from(data['user'] as Map);
      setState(() {
        _firstName.text = (profile['firstName'] as String?) ?? '';
        _lastName.text = (profile['lastName'] as String?) ?? '';
        _dob.text = (profile['dateOfBirth'] as String?) ?? '';
        _country.text = (profile['country'] as String?) ?? '';
        _status = user['status'] as String?;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await _client().patch(
        '/api/profile',
        auth: true,
        body: {
          'firstName': _firstName.text.trim(),
          'lastName': _lastName.text.trim(),
          'dateOfBirth': _dob.text.trim().isEmpty ? null : _dob.text.trim(),
          'country': _country.text.trim(),
        },
      );
      setState(() => _message = 'Profile saved');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Network error');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: ListView(
          children: [
            if (_status != null) Text('Status: $_status'),
            TextField(
              controller: _firstName,
              decoration: const InputDecoration(labelText: 'First name'),
            ),
            TextField(
              controller: _lastName,
              decoration: const InputDecoration(labelText: 'Last name'),
            ),
            TextField(
              controller: _dob,
              decoration: const InputDecoration(labelText: 'DOB YYYY-MM-DD'),
            ),
            TextField(
              controller: _country,
              decoration: const InputDecoration(labelText: 'Country'),
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_message != null) Text(_message!),
            const SizedBox(height: 16),
            FilledButton(onPressed: _save, child: const Text('Save')),
            TextButton(
              onPressed: () => Navigator.of(context).pushNamed('/verification'),
              child: const Text('Verification'),
            ),
          ],
        ),
      ),
    );
  }
}
