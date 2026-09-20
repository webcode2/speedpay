import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.code, this.message);
  final String code;
  final String message;

  @override
  String toString() => '$code: $message';
}

class ApiClient {
  ApiClient({required this.baseUrl, this.getToken});

  final String baseUrl;
  final Future<String?> Function()? getToken;

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) {
    return _send('POST', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) {
    return _send('PATCH', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> get(String path, {bool auth = false}) {
    return _send('GET', path, auth: auth);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (auth) {
      final token = await getToken?.call();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    late http.Response response;
    if (method == 'GET') {
      response = await http.get(uri, headers: headers);
    } else if (method == 'PATCH') {
      response = await http.patch(
        uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
      );
    } else {
      response = await http.post(
        uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw ApiException('INTERNAL_ERROR', 'Unexpected response');
    }
    if (decoded['success'] == true) {
      final data = decoded['data'];
      if (data is Map<String, dynamic>) return data;
      return <String, dynamic>{'value': data};
    }
    final error = decoded['error'];
    throw ApiException(
      error is Map ? (error['code'] as String? ?? 'INTERNAL_ERROR') : 'INTERNAL_ERROR',
      error is Map ? (error['message'] as String? ?? 'Request failed') : 'Request failed',
    );
  }
}
