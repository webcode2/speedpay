import 'package:flutter_test/flutter_test.dart';
import 'package:solar_investment_mobile/main.dart';

void main() {
  testWidgets('app builds', (WidgetTester tester) async {
    await tester.pumpWidget(const SolarInvestmentApp());
    expect(find.byType(SolarInvestmentApp), findsOneWidget);
  });
}
