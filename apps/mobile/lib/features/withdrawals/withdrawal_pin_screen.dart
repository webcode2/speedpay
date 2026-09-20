import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class WithdrawalPinScreen extends StatefulWidget {
  const WithdrawalPinScreen({super.key});

  @override
  State<WithdrawalPinScreen> createState() => _WithdrawalPinScreenState();
}

class _WithdrawalPinScreenState extends State<WithdrawalPinScreen> {
  bool? _hasPin;
  final _pin = TextEditingController();
  final _current = TextEditingController();
  final _next = TextEditingController();
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
    _pin.dispose();
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ApiClient>().get('/api/withdrawal-pin', auth: true);
      setState(() {
        _hasPin = data['hasPin'] as bool? ?? false;
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _setPin() async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await context.read<ApiClient>().post(
        '/api/withdrawal-pin',
        auth: true,
        body: {'pin': _pin.text.trim()},
      );
      setState(() {
        _hasPin = true;
        _message = 'PIN set';
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _changePin() async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await context.read<ApiClient>().post(
        '/api/withdrawal-pin',
        auth: true,
        body: {
          'action': 'change',
          'currentPin': _current.text.trim(),
          'newPin': _next.text.trim(),
        },
      );
      setState(() => _message = 'PIN changed');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Withdrawal PIN')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (_message != null)
                  Text(_message!, style: const TextStyle(color: Colors.green)),
                Text(_hasPin == true ? 'PIN is set' : 'No PIN set yet'),
                const SizedBox(height: 16),
                if (_hasPin != true) ...[
                  TextField(
                    controller: _pin,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'New PIN (4–6 digits)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _setPin, child: const Text('Set PIN')),
                ] else ...[
                  TextField(
                    controller: _current,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Current PIN'),
                  ),
                  TextField(
                    controller: _next,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'New PIN'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _changePin,
                    child: const Text('Change PIN'),
                  ),
                ],
              ],
            ),
    );
  }
}
