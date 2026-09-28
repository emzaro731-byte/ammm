import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const subjects=['Mathematics','English','Physics','Chemistry','Biology','Economics'];
class Q{final String text;final List<String> options;final int answer;final String subject;final String explanation;const Q(this.text,this.options,this.answer,this.subject,this.explanation);}
const questions=[
Q('If 2x + 6 = 14, what is x?',['2','3','4','5'],2,'Mathematics','Subtract 6, then divide by 2.'),
Q('What is the synonym of rapid?',['Slow','Quick','Weak','Late'],1,'English','Rapid means quick or fast.'),
Q('Which quantity is measured in newtons?',['Mass','Force','Power','Energy'],1,'Physics','The newton is the SI unit of force.'),
Q('What is the pH of a neutral solution at 25 degrees C?',['0','5','7','14'],2,'Chemistry','A neutral solution has pH 7.'),
Q('Which organelle is the powerhouse of the cell?',['Nucleus','Ribosome','Mitochondrion','Golgi body'],2,'Biology','Mitochondria produce most cellular ATP.')];
SupabaseClient? get supabase=>Supabase.instance.isInitialized?Supabase.instance.client:null;

Future<void> main()async{
 WidgetsFlutterBinding.ensureInitialized();
 const u=String.fromEnvironment('SUPABASE_URL'); const k=String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
 if(u.isNotEmpty&&k.isNotEmpty)await Supabase.initialize(url:u,publishableKey:k);
 runApp(const ExamPilot());
}
class ExamPilot extends StatelessWidget{const ExamPilot({super.key});@override Widget build(BuildContext c)=>MaterialApp(debugShowCheckedModeBanner:false,title:'ExamPilot AI',theme:ThemeData(useMaterial3:true,colorSchemeSeed:Colors.indigo),home:const Home());}

class Home extends StatelessWidget{
 const Home({super.key});
 void go(BuildContext c,Widget page)=>Navigator.push(c,MaterialPageRoute(builder:(_)=>page));
 @override Widget build(BuildContext c)=>Scaffold(
 appBar:AppBar(title:const Text('ExamPilot AI'),actions:[IconButton(tooltip:'Account',onPressed:()=>go(c,const Account()),icon:const Icon(Icons.person))]),
 body:ListView(padding:const EdgeInsets.all(18),children:[
 Text('Prepare. Practice. Improve.',style:Theme.of(c).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.bold)),
 const SizedBox(height:8),const Text('JAMB • WAEC • NECO • University Entrance'),
 const SizedBox(height:20),
 FilledButton.icon(onPressed:()=>go(c,const Practice()),icon:const Icon(Icons.play_arrow),label:const Text('Start CBT')),
 const SizedBox(height:10),
 OutlinedButton.icon(onPressed:()=>go(c,const Tutor()),icon:const Icon(Icons.auto_awesome),label:const Text('Ask AI')),
 const SizedBox(height:10),
 OutlinedButton.icon(onPressed:()=>go(c,const Progress()),icon:const Icon(Icons.insights),label:const Text('My Progress')),
 const SizedBox(height:20),const Text('Subjects',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
 Wrap(spacing:8,children:subjects.map((s)=>Chip(label:Text(s))).toList())
 ]));}

class Practice extends StatefulWidget{const Practice({super.key});@override State<Practice> createState()=>_PracticeState();}
class _PracticeState extends State<Practice>{String subject='All';int count=5;@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('CBT Practice')),body:ListView(padding:const EdgeInsets.all(18),children:[
DropdownButtonFormField<String>(initialValue:subject,decoration:const InputDecoration(labelText:'Subject',border:OutlineInputBorder()),items:['All',...subjects].map((s)=>DropdownMenuItem(value:s,child:Text(s))).toList(),onChanged:(v)=>setState(()=>subject=v!)),
const SizedBox(height:15),DropdownButtonFormField<int>(initialValue:count,decoration:const InputDecoration(labelText:'Number of questions',border:OutlineInputBorder()),items:[5,10,20].map((n)=>DropdownMenuItem(value:n,child:Text(n.toString()))).toList(),onChanged:(v)=>setState(()=>count=v!)),
const SizedBox(height:20),FilledButton.icon(onPressed:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>Quiz(subject:subject,count:count))),icon:const Icon(Icons.play_arrow),label:const Text('Start CBT'))]));}}

class Quiz extends StatefulWidget{final String subject;final int count;const Quiz({super.key,required this.subject,required this.count});@override State<Quiz> createState()=>_QuizState();}
class _QuizState extends State<Quiz>{
 late List<Q> qs;late List<int?> chosen;int pos=0,seconds=600;Timer? timer;bool finishing=false;
 @override void initState(){super.initState();qs=questions.where((q)=>widget.subject=='All'||q.subject==widget.subject).toList();if(qs.isEmpty)qs=questions;while(qs.length<widget.count)qs.addAll(questions);qs=qs.take(widget.count).toList();chosen=List<int?>.filled(qs.length,null);timer=Timer.periodic(const Duration(seconds:1),(_){if(!mounted)return;if(seconds>0)setState(()=>seconds--);else finish();});}
 @override void dispose(){timer?.cancel();super.dispose();}
 Future<void> finish()async{if(finishing)return;finishing=true;timer?.cancel();int score=0;for(var i=0;i<qs.length;i++){if(chosen[i]==qs[i].answer)score++;}if(supabase?.auth.currentUser!=null){try{await supabase!.from('attempts').insert({'user_id':supabase!.auth.currentUser!.id,'exam':'CBT Practice','subject':widget.subject=='All'?'Mixed':widget.subject,'score':score,'total':qs.length});}catch(_){}}if(!mounted)return;Navigator.pushReplacement(context,MaterialPageRoute(builder:(_)=>Result(score:score,qs:qs,chosen:chosen)));}
 @override Widget build(BuildContext c){final q=qs[pos];final mins=seconds~/60;final secs=(seconds%60).toString().padLeft(2,'0');return Scaffold(appBar:AppBar(title:Text('Question '+(pos+1).toString()+'/'+qs.length.toString()),actions:[Padding(padding:const EdgeInsets.all(14),child:Text(mins.toString()+':'+secs))]),body:ListView(padding:const EdgeInsets.all(18),children:[LinearProgressIndicator(value:(pos+1)/qs.length),const SizedBox(height:20),Text(q.subject,style:const TextStyle(fontWeight:FontWeight.bold)),const SizedBox(height:10),Text(q.text,style:Theme.of(c).textTheme.titleLarge),const SizedBox(height:18),...List.generate(q.options.length,(i)=>Card(color:chosen[pos]==i?Theme.of(c).colorScheme.primaryContainer:null,child:ListTile(onTap:()=>setState(()=>chosen[pos]=i),leading:CircleAvatar(child:Text(String.fromCharCode(65+i))),title:Text(q.options[i])))),const SizedBox(height:15),Row(children:[if(pos>0)Expanded(child:OutlinedButton(onPressed:()=>setState(()=>pos--),child:const Text('Previous'))),if(pos>0)const SizedBox(width:10),Expanded(child:FilledButton(onPressed:finishing?null:(pos==qs.length-1?finish:()=>setState(()=>pos++)),child:Text(pos==qs.length-1?'Submit':'Next')))])]);}}

class Result extends StatelessWidget{final int score;final List<Q> qs;final List<int?> chosen;const Result({super.key,required this.score,required this.qs,required this.chosen});@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('Result')),body:ListView(padding:const EdgeInsets.all(18),children:[Card(child:Padding(padding:const EdgeInsets.all(22),child:Column(children:[Text(score.toString()+' / '+qs.length.toString(),style:Theme.of(c).textTheme.displaySmall),Text((score*100~/qs.length).toString()+'%'),const Text('Review your answers below.')] ))),...List.generate(qs.length,(i)=>ExpansionTile(title:Text('Question '+(i+1).toString()),subtitle:Text(chosen[i]==qs[i].answer?'Correct':'Review'),children:[ListTile(title:Text(qs[i].text)),ListTile(title:Text('Answer: '+qs[i].options[qs[i].answer])),ListTile(title:Text(qs[i].explanation))]))]));}}

class Tutor extends StatefulWidget{const Tutor({super.key});@override State<Tutor> createState()=>_TutorState();}
class _TutorState extends State<Tutor>{final ctl=TextEditingController();String answer='Ask an exam question. I will explain the solution step by step.';bool busy=false;Future<void> ask()async{if(ctl.text.trim().isEmpty)return;setState(()=>busy=true);try{if(supabase!=null){final r=await supabase!.functions.invoke('ai-tutor',body:{'question':ctl.text.trim()});answer=r.data is Map?(r.data['answer']??'No answer returned.').toString():r.data.toString();}else{answer='Connect the Supabase AI Tutor function and Groq secret to enable live AI answers.';}}catch(e){answer='AI Tutor is not connected yet. Check the Supabase Edge Function.';}if(mounted)setState(()=>busy=false);}
@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('AI Tutor')),body:ListView(padding:const EdgeInsets.all(18),children:[Card(child:Padding(padding:const EdgeInsets.all(18),child:Text(answer))),const SizedBox(height:15),TextField(controller:ctl,maxLines:4,decoration:const InputDecoration(hintText:'Ask your question...',border:OutlineInputBorder())),const SizedBox(height:12),FilledButton.icon(onPressed:busy?null:ask,icon:const Icon(Icons.send),label:Text(busy?'Thinking...':'Ask AI'))]));}}
class Progress extends StatefulWidget{const Progress({super.key});@override State<Progress> createState()=>_ProgressState();}
class _ProgressState extends State<Progress>{
 bool loading=true;List<Map<String,dynamic>> attempts=[];
 @override void initState(){super.initState();load();}
 Future<void> load()async{if(supabase?.auth.currentUser==null){if(mounted)setState(()=>loading=false);return;}try{final data=await supabase!.from('attempts').select('id,exam,subject,score,total,created_at').order('created_at',ascending:false).limit(30);attempts=List<Map<String,dynamic>>.from(data);}catch(_){ }if(mounted)setState(()=>loading=false);}
 @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('My Progress')),body:loading?const Center(child:CircularProgressIndicator()):RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(18),children:[if(supabase?.auth.currentUser==null)Card(child:ListTile(title:const Text('Sign in to save progress'),subtitle:const Text('Your CBT scores will be stored securely.'),trailing:TextButton(onPressed:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>const Account())),child:const Text('Sign in')))),if(supabase?.auth.currentUser!=null&&attempts.isEmpty)const Card(child:ListTile(title:Text('No attempts yet'),subtitle:Text('Complete a CBT to see your scores here.'))),...attempts.map((a){final total=(a['total'] as num?)?.toInt()??0;final score=(a['score'] as num?)?.toInt()??0;final pct=total==0?0:score*100~/total;return Card(child:ListTile(title:Text((a['subject']??'Mixed').toString()+' — '+score.toString()+'/'+total.toString()),subtitle:Text((a['exam']??'CBT').toString()+' • '+pct.toString()+'%'),trailing:const Icon(Icons.check_circle_outline)));})])));}

class Account extends StatefulWidget{const Account({super.key});@override State<Account> createState()=>_AccountState();}
const Account({super.key});@override Widget build(BuildContext c){final u=supabase?.auth.currentUser;return Scaffold(appBar:AppBar(title:const Text('Account')),body:Padding(padding:const EdgeInsets.all(18),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(u?.email??'Guest mode',style:Theme.of(c).textTheme.titleLarge),const SizedBox(height:12),if(u!=null)FilledButton(onPressed:()async{await supabase!.auth.signOut();if(c.mounted)Navigator.pop(c);},child:const Text('Sign out'))else const Text('Supabase Auth can be enabled for cloud accounts and progress.') ]));}}
