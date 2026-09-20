import 'package:flutter/material.dart';

class ReturnSeriesChart extends StatelessWidget {
  const ReturnSeriesChart({super.key, required this.series});

  final List<Map<String, dynamic>> series;

  @override
  Widget build(BuildContext context) {
    if (series.length < 2) {
      return const SizedBox(
        height: 120,
        child: Center(child: Text('Not enough data for chart')),
      );
    }
    final values = series
        .map((p) => (p['accruedReturn'] as num?)?.toDouble() ?? 0)
        .toList();
    return SizedBox(
      height: 160,
      width: double.infinity,
      child: CustomPaint(
        painter: _SeriesPainter(
          values: values,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }
}

class _SeriesPainter extends CustomPainter {
  _SeriesPainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final minV = values.reduce((a, b) => a < b ? a : b);
    final maxV = values.reduce((a, b) => a > b ? a : b);
    final span = (maxV - minV).abs() < 1e-9 ? 1.0 : (maxV - minV);
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = size.width * (i / (values.length - 1));
      final y = size.height - ((values[i] - minV) / span) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SeriesPainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.color != color;
  }
}
