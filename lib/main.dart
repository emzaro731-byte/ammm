import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
Future<void> main() async {
 WidgetsFlutterBinding.ensureInitialized();
 const u=String.fromEnvironment('SUPABASE_URL');
 const k=String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
 if(u.isEmpty||k.isEmpty){runApp(const MaterialApp(home:Scaffold(body:Center(child:Text('Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY')))));return;}
 await Supabase.initialize(url:u,publishableKey:k); runApp(const App());
}
