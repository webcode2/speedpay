import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  bool _loading = true;
  String? _error;
  bool _profileDone = false;
  bool _kycDone = false;
  bool _payoutDone = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final profileData = await api.get('/api/profile', auth: true);
      final verification = await api.get('/api/verification', auth: true);
      final payouts = await api.get('/api/payout-accounts', auth: true);
      final complete = profileData['complete'] == true;
      final profile = profileData['profile'] is Map
          ? Map<String, dynamic>.from(profileData['profile'] as Map)
          : <String, dynamic>{};
      final firstName = profile['firstName'] as String?;
      final lastName = profile['lastName'] as String?;
      final kyc = verification['status'] as String? ?? 'NOT_STARTED';
      final items = (payouts['items'] as List?) ?? [];
      if (!mounted) return;
      setState(() {
        _profileDone = complete ||
            (firstName != null && firstName.isNotEmpty) ||
            (lastName != null && lastName.isNotEmpty);
        _kycDone = kyc == 'APPROVED' || kyc == 'PENDING' || kyc == 'UNDER_REVIEW';
        _payoutDone = items.isNotEmpty;
        _loading = false;
        if (!_profileDone) {
          _step = 0;
        } else if (!_kycDone) {
          _step = 1;
        } else if (!_payoutDone) {
          _step = 2;
        } else {
          _step = 3;
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Get started'),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.of(context).pushReplacementNamed('/home'),
            child: const Text('Skip'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  Text(
                    'Step ${_step >= 3 ? 3 : _step + 1} of 3',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  _StepTile(
                    done: _profileDone,
                    title: '1. Profile',
                    subtitle: 'Add your name and contact details',
                    onTap: () async {
                      await Navigator.of(context).pushNamed('/profile');
                      await _refresh();
                    },
                  ),
                  _StepTile(
                    done: _kycDone,
                    title: '2. Verification',
                    subtitle: 'Upload ID and selfie, then submit',
                    onTap: () async {
                      await Navigator.of(context).pushNamed('/verification');
                      await _refresh();
                    },
                  ),
                  _StepTile(
                    done: _payoutDone,
                    title: '3. Payout account',
                    subtitle: 'Add a bank account for withdrawals',
                    onTap: () async {
                      await Navigator.of(context).pushNamed('/payout-accounts');
                      await _refresh();
                    },
                  ),
                  const Spacer(),
                  if (_profileDone && _kycDone && _payoutDone)
                    FilledButton(
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed('/home'),
                      child: const Text('Go to dashboard'),
                    )
                  else
                    OutlinedButton(
                      onPressed: () => Navigator.of(context)
                          .pushReplacementNamed('/home'),
                      child: const Text('Continue later'),
                    ),
                ],
              ),
            ),
    );
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile({
    required this.done,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool done;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(
          done ? Icons.check_circle : Icons.radio_button_unchecked,
          color: done ? Colors.teal : null,
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
