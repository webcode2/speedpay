import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

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
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data =
          await context.read<ApiClient>().get('/api/verification', auth: true);
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

  Future<void> _upload(String documentType) async {
    setState(() {
      _error = null;
      _message = null;
      _uploading = true;
    });
    try {
      final file = await FilePicker.pickFile(type: FileType.image);
      if (file == null) {
        setState(() => _uploading = false);
        return;
      }
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        setState(() {
          _error = 'Could not read file bytes';
          _uploading = false;
        });
        return;
      }
      if (!mounted) return;
      final api = context.read<ApiClient>();
      final multipart = http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: file.name,
      );
      await api.postMultipart(
        '/api/verification/documents',
        auth: true,
        fields: {'documentType': documentType},
        files: [multipart],
      );
      setState(() => _message = '$documentType uploaded');
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await context
          .read<ApiClient>()
          .post('/api/verification', auth: true, body: {});
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
            ..._documents.map((d) {
              final m = Map<String, dynamic>.from(d as Map);
              return ListTile(
                dense: true,
                title: Text('${m['documentType']} — ${m['fileName']}'),
              );
            }),
            const SizedBox(height: 8),
            const Text(
              'Upload ID_FRONT and SELFIE, then submit for review.',
              style: TextStyle(fontSize: 13),
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_message != null) Text(_message!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _uploading ? null : () => _upload('ID_FRONT'),
              child: const Text('Upload ID front'),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _uploading ? null : () => _upload('SELFIE'),
              child: const Text('Upload selfie'),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _uploading ? null : _submit,
              child: const Text('Submit for review'),
            ),
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
