import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL');
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  if (url.isNotEmpty && key.isNotEmpty) {
    await Supabase.initialize(url: url, publishableKey: key);
  }
  runApp(const ExamPilotApp());
}

class ExamPilotApp extends StatelessWidget {
  const ExamPilotApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'ExamPilot AI',
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
    home: const HomePage(),
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('ExamPilot AI')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Prepare. Practice. Improve.', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        const Text('JAMB • WAEC • NECO • University Entrance'),
        const SizedBox(height: 24),
        _card(context, Icons.quiz_outlined, 'CBT Practice', 'Practice timed exam questions.'),
        _card(context, Icons.auto_awesome, 'AI Tutor', 'Ask questions and get step-by-step explanations.'),
        _card(context, Icons.insights, 'My Progress', 'Track scores and weak topics.'),
        _card(context, Icons.bookmark_outline, 'Saved Questions', 'Keep questions for revision.'),
      ],
    ),
  );

  Widget _card(BuildContext c, IconData icon, String title, String subtitle) =>
      Card(child: ListTile(leading: Icon(icon), title: Text(title), subtitle: Text(subtitle), trailing: const Icon(Icons.chevron_right)));
}
