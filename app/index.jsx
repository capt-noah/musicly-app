import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { 
  KeyboardAvoidingView, 
  TouchableOpacity, 
  ScrollView, 
  View, 
  Text,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, User, Eye, EyeOff, Activity, IdCard } from "lucide-react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import "../global.css";

export default function Index() {
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/tabs/Home");
    }
  }, [isAuthenticated]);

  const handleAuth = async () => {
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!password) missingFields.push('password');
    if (isSignUp && !fullName) missingFields.push('fullName');
    if (isSignUp && !email) missingFields.push('email');
    
    if (missingFields.length > 0) {
      setFieldErrors(missingFields);
      setError("Please fill in all marked fields");
      return;
    }

    if (isSignUp && !termsAccepted) {
      setError("Please accept the terms");
      setFieldErrors([]);
      return;
    }

    setFieldErrors([]);
    setError("");
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        // Split full name into first and last
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        
        result = await register({ 
          username, 
          email,
          password, 
          firstName, 
          lastName 
        });
      } else {
        result = await login(username, password);
      }

      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setFieldErrors([]);
    setTermsAccepted(false);
  };

  if (authLoading) {
    return (
      <View className="flex-1 bg-[#101211] items-center justify-center">
        <ActivityIndicator color="#b1cbba" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1 bg-[#101211]">
        {/* Soft Background Glows matching the screenshot */}
        <View className="absolute top-0 w-full h-[50vh] overflow-hidden">
          <View className="absolute -top-32 left-[5%] w-[90%] h-96 bg-[#263128] rounded-[100px] opacity-40 blur-3xl transform rotate-12" />
        </View>

        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            className="px-6 pt-16"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Area */}
            <View className="items-center mb-8 z-10">
              <View className="w-16 h-16 rounded-3xl overflow-hidden items-center justify-center mb-6 shadow-2xl border border-[#ffffff08]">
                <Image 
                  source={require('../assets/images/icon.png')} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="cover"
                />
              </View>
              {!isSignUp && (
                 <Text className="text-[#ffffff] text-xs font-bold tracking-[0.3rem] uppercase mb-4 opacity-90">
                   MUSICLY
                 </Text>
              )}
              <Text className="text-[#ffffff] text-[32px] font-extrabold tracking-tight mb-2">
                {isSignUp ? "Create Account" : "Sign in"}
              </Text>
              <Text className="text-[#a6ada6] text-center text-[13px] max-w-[260px] leading-5">
                {isSignUp 
                  ? "Join the Musicly high-fidelity audio community." 
                  : "Sign in to continue your sonic journey."}
              </Text>
            </View>

            {/* Input Card Container */}
            <View className="bg-[#121413] p-6 rounded-[32px] border border-[#ffffff0a] shadow-2xl z-10">
              <View className="gap-6">
                {isSignUp && (
                  <View>
                    <Text className="text-[10px] font-black tracking-widest text-[#a6ada6] uppercase ml-1 mb-2">
                      Full Name
                    </Text>
                    <View className="relative justify-center">
                      <View className="absolute left-4 z-10">
                        <IdCard size={18} color="#a6ada6" />
                      </View>
                      <View className={`bg-[#0b0c0b] border ${fieldErrors.includes('fullName') ? 'border-red-500/50' : 'border-[#ffffff08]'} rounded-2xl px-12 py-4 shadow-inner`}>
                        <TextInput
                          placeholder="Abebe Kebede"
                          placeholderTextColor="#a6ada666"
                          value={fullName}
                          onChangeText={setFullName}
                          className="text-[#e1e7df] text-[15px] font-medium"
                        />
                      </View>
                    </View>
                  </View>
                )}

                 <View>
                  <Text className="text-[10px] font-black tracking-widest text-[#a6ada6] uppercase ml-1 mb-2">
                    Username
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                      <User size={18} color="#a6ada6" />
                    </View>
                    <View className={`bg-[#0b0c0b] border ${fieldErrors.includes('username') ? 'border-red-500/50' : 'border-[#ffffff08]'} rounded-2xl px-12 py-4 shadow-inner`}>
                      <TextInput
                        placeholder="abebe_k"
                        placeholderTextColor="#a6ada666"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        className="text-[#e1e7df] text-[15px] font-medium"
                      />
                    </View>
                  </View>
                </View>

                {isSignUp && (
                  <View>
                    <Text className="text-[10px] font-black tracking-widest text-[#a6ada6] uppercase ml-1 mb-2">
                      Email Address
                    </Text>
                    <View className="relative justify-center">
                      <View className="absolute left-4 z-10">
                        <Mail size={18} color="#a6ada6" />
                      </View>
                      <View className={`bg-[#0b0c0b] border ${fieldErrors.includes('email') ? 'border-red-500/50' : 'border-[#ffffff08]'} rounded-2xl px-12 py-4 shadow-inner`}>
                        <TextInput
                          keyboardType="email-address"
                          placeholder="abebe@musicly.com"
                          placeholderTextColor="#a6ada666"
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          autoCorrect={false}
                          spellCheck={false}
                          className="text-[#e1e7df] text-[15px] font-medium"
                        />
                      </View>
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-[10px] font-black tracking-widest text-[#a6ada6] uppercase ml-1 mb-2">
                    {isSignUp ? "Secure Password" : "Password"}
                  </Text>
                  <View className="relative justify-center flex-row items-center w-full">
                    <View className="absolute left-4 z-10">
                      <Lock size={18} color="#a6ada6" />
                    </View>
                    <View className={`flex-row items-center justify-between flex-1 bg-[#0b0c0b] border ${fieldErrors.includes('password') ? 'border-red-500/50' : 'border-[#ffffff08]'} rounded-2xl px-12 py-4 shadow-inner`}>
                      <TextInput
                        secureTextEntry={!showPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#a6ada666"
                        value={password}
                        onChangeText={setPassword}
                        className="text-[#e1e7df] text-[15px] font-medium flex-1 h-full"
                      />
                      <TouchableOpacity 
                         onPress={() => setShowPassword(!showPassword)}
                         className="absolute right-4 p-2"
                      >
                         {showPassword ? <EyeOff size={18} color="#a6ada6" /> : <Eye size={18} color="#a6ada6" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {error ? (
                  <View className="px-1 py-1">
                    <Text className="text-red-400 text-[12px] font-semibold">{error}</Text>
                  </View>
                ) : null}

                {isSignUp && (
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    className="flex-row items-center pr-4 mt-2"
                  >
                    <View className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${termsAccepted ? 'bg-[#b1cbba] border-[#b1cbba]' : 'border-[#434944] bg-[#0b0c0b]'}`}>
                      {termsAccepted && <Ionicons name="checkmark" size={14} color="#101211" />}
                    </View>
                    <Text className="flex-1 text-[#a6ada6] text-[11px] leading-4">
                      I accept the Terms of Artistry and acknowledge the Privacy Manifesto.
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isSignUp && (
                <TouchableOpacity className="items-end mt-4">
                  <Text className="text-[#a6ada6] text-xs font-semibold">
                    Forgot credentials?
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={handleAuth} 
                className="w-full bg-[#b1cbba] rounded-2xl py-4 items-center justify-center mt-6 shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#101211" size="small" />
                ) : (
                  <Text className="text-[#101211] font-bold text-[15px]">
                    {isSignUp ? "Join Musicly" : "Continue to Musicly"}
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center space-x-4 my-6 opacity-60">
                <View className="flex-1 h-[1px] bg-[#434944]" />
                <Text className="text-[#a6ada6] text-[10px] font-black uppercase tracking-[0.15em]">
                  {isSignUp ? "OR" : "OR CONNECT WITH"}
                </Text>
                <View className="flex-1 h-[1px] bg-[#434944]" />
              </View>

              <View className="flex-row justify-between gap-4">
                <TouchableOpacity 
                  className="flex-1 bg-[#161817] border border-[#ffffff0a] py-3.5 rounded-xl flex-row justify-center items-center"
                >
                  <FontAwesome5 name="google" size={16} color="#DB4437" />
                  <Text className="text-[#e1e7df] text-[14px] font-semibold ml-3">
                    Google
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-[#161817] border border-[#ffffff0a] py-3.5 rounded-xl flex-row justify-center items-center"
                >
                  <FontAwesome5 name="apple" size={18} color="#ffffff" />
                  <Text className="text-[#e1e7df] text-[14px] font-semibold ml-2">
                    Apple
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="pt-8 items-center">
                <TouchableOpacity onPress={handleToggleMode} className="flex-row items-center">
                  <Text className="text-[#a6ada6] text-[13px] font-medium">
                    {isSignUp ? "Already part of Musicly? " : "New to Musicly? "}
                  </Text>
                  <Text className="text-[#fff] text-[13px] font-bold tracking-tight">
                    {isSignUp ? "Sign in" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
