import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() => runApp(const VeylolaApp());

class VeylolaApp extends StatelessWidget {
  const VeylolaApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Veylola AI',
    theme: ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF050B18),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF4D7CFE),
        brightness: Brightness.dark,
      ),
      useMaterial3: true,
    ),
    home: const ChatPage(),
  );
}

class Message {
  final String text;
  final bool user;
  Message(this.text, this.user);
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  static const apiBase = String.fromEnvironment(
    'VEYLOLA_API_URL',
    defaultValue: 'https://api-gctb.onrender.com',
  );
  final controller = TextEditingController();
  final scroll = ScrollController();
  final messages = <Message>[
    Message('Hello. I’m Veylola AI. How can I help you today?', false),
  ];
  bool loading = false;
  String provider = 'Veylola';

  Future<void> send() async {
    final text = controller.text.trim();
    if (text.isEmpty || loading) return;
    setState(() {
      messages.add(Message(text, true));
      controller.clear();
      loading = true;
    });
    _scrollDown();
    try {
      final response = await http.post(
        Uri.parse('$apiBase/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'message': text, 'provider': provider.toLowerCase()}),
      );
      final data = jsonDecode(response.body);
      final answer = (data['response'] ?? data['text'] ?? data['message'] ??
              'I could not generate a response.')
          .toString();
      if (!mounted) return;
      setState(() => messages.add(Message(answer, false)));
    } catch (e) {
      if (!mounted) return;
      setState(() => messages.add(
        Message('Connection error. Check your API server and try again.', false),
      ));
    } finally {
      if (mounted) {
        setState(() => loading = false);
        _scrollDown();
      }
    }
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scroll.hasClients) {
        scroll.animateTo(
          scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    controller.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF071126),
        titleSpacing: 18,
        title: Row(children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: const LinearGradient(
                colors: [Color(0xFF4D7CFE), Color(0xFF8B5CF6)],
              ),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Veylola AI', style: TextStyle(fontWeight: FontWeight.bold)),
              Text('AI assistant', style: TextStyle(fontSize: 11, color: Colors.white54)),
            ],
          ),
        ]),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
          child: Row(children: [
            const Text('AI mode', style: TextStyle(color: Colors.white60)),
            const SizedBox(width: 10),
            DropdownButton<String>(
              value: provider,
              dropdownColor: const Color(0xFF101B32),
              items: const ['Veylola', 'Groq', 'Grok'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
              onChanged: (v) => setState(() => provider = v ?? 'Veylola'),
            ),
          ]),
        },
        Expanded(
          child: ListView.builder(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(14, 18, 14, 12),
            itemCount: messages.length + (loading ? 1 : 0),
            itemBuilder: (_, i) {
              if (loading && i == messages.length) {
                return const Padding(
                  padding: EdgeInsets.all(12),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Veylola is thinking…', style: TextStyle(color: Colors.white54)),
                  ),
                );
              }
              final m = messages[i];
              return Align(
                alignment: m.user ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 340),
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
                  decoration: BoxDecoration(
                    color: m.user ? const Color(0xFF315FEA) : const Color(0xFF101B32),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Text(m.text, style: const TextStyle(fontSize: 15, height: 1.4)),
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  onSubmitted: (_) => send(),
                  decoration: InputDecoration(
                    hintText: 'Message Veylola…',
                    filled: true,
                    fillColor: const Color(0xFF101B32),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: loading ? null : send,
                icon: const Icon(Icons.arrow_upward),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF4D7CFE),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(14),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
