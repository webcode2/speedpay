import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../returns/return_series_chart.dart';

class InvestmentDetailScreen extends StatefulWidget {
  const InvestmentDetailScreen({super.key, required this.investmentId});

  final String investmentId;

  @override
  State<InvestmentDetailScreen> createState() => _InvestmentDetailScreenState();
}

class _InvestmentDetailScreenState extends State<InvestmentDetailScreen> {
  Map<String, dynamic>? _inv;
  Map<String, dynamic>? _returnsDetail;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client =
        context.read<ApiClient>();
    try {
      final data = await client.get(
        '/api/investments/${widget.investmentId}',
        auth: true,
      );
      final returnsData = await client.get(
        '/api/investments/${widget.investmentId}/returns',
        auth: true,
      );
      setState(() {
        _inv = Map<String, dynamic>.from(data['investment'] as Map);
        _returnsDetail =
            Map<String, dynamic>.from(returnsData['returns'] as Map);
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
    final inv = _inv;
    final returns = _returnsDetail ?? (inv?['returns'] as Map?);
    final timeline = (inv?['timeline'] as List?) ?? [];
    final txs = (inv?['transactions'] as List?) ?? [];
    final lots = (inv?['lots'] as List?) ?? [];
    final series = ((_returnsDetail?['series'] as List?) ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return Scaffold(
      appBar: AppBar(title: Text(inv?['packageName'] as String? ?? 'Investment')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (inv != null) ...[
                  Text('Status: ${inv['status']}'),
                  Text('Project: ${inv['projectName']}'),
                  Text('Lots: ${inv['lotCount']}'),
                  Text('Principal: ${inv['principal']}'),
                  Text('Return: ${inv['returnType']} ${inv['returnRate']}%'),
                  const SizedBox(height: 16),
                  Text('Returns', style: Theme.of(context).textTheme.titleLarge),
                  if (returns != null) ...[
                    Text('Today: ${returns['todayReturn'] ?? '—'}'),
                    Text('Accrued: ${returns['accruedReturn']}'),
                    Text('Expected: ${returns['expectedReturn']}'),
                    Text('Current value: ${returns['currentValue']}'),
                    Text('Maturity value: ${returns['maturityValue']}'),
                    Text(
                      'Progress: ${(returns['percentageComplete'] as num?)?.toStringAsFixed(1)}%',
                    ),
                    Text('Mature: ${returns['isMature']}'),
                    const SizedBox(height: 12),
                    Text(
                      'Performance',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    ReturnSeriesChart(series: series),
                  ],
                  const SizedBox(height: 16),
                  Text('Timeline', style: Theme.of(context).textTheme.titleLarge),
                  ...timeline.whereType<Map>().map((t) {
                    return ListTile(
                      dense: true,
                      title: Text('${t['label']}'),
                      subtitle: Text('${t['at']}'),
                    );
                  }),
                  const SizedBox(height: 8),
                  Text('Lots', style: Theme.of(context).textTheme.titleLarge),
                  ...lots.whereType<Map>().map((l) {
                    return Text(
                      '${l['lotCount']} × ${l['pricePerLot']} = ${l['totalAmount']}',
                    );
                  }),
                  const SizedBox(height: 16),
                  Text(
                    'Transactions',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (txs.isEmpty) const Text('No linked wallet transactions.'),
                  ...txs.whereType<Map>().map((t) {
                    return ListTile(
                      dense: true,
                      title: Text('${t['type']} · ${t['direction']}'),
                      subtitle: Text('${t['amount']} ${t['currency']} · ${t['status']}'),
                    );
                  }),
                ],
              ],
            ),
    );
  }
}
