import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:solar_investment_mobile/core/api/api_client.dart';
import 'package:solar_investment_mobile/core/auth/auth_repository.dart';
import 'package:solar_investment_mobile/core/auth/session_store.dart';
import 'package:solar_investment_mobile/main.dart';

void main() {
  testWidgets('app builds', (WidgetTester tester) async {
    final store = SessionStore();
    final api = ApiClient(baseUrl: 'http://localhost:3000', getToken: store.readToken);
    final auth = AuthRepository(api: api, sessionStore: store);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider.value(value: store),
          Provider.value(value: api),
          Provider.value(value: auth),
        ],
        child: const SolarInvestmentApp(),
      ),
    );
    expect(find.byType(SolarInvestmentApp), findsOneWidget);
  });
}
