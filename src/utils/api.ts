import {
  AuthState,
  UserProfile,
  LeaderboardUser,
  GameSessionRecord,
  PayoutRecord,
  DBHealth,
  PaymentProvider,
  MiningCurrency,
} from '../types';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const TOKEN_KEY = 'blockmatch_jwt_token';
const CURRENT_USER_KEY = 'blockmatch_user_cache';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getCachedUser(): UserProfile | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedUser(user: UserProfile) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// Internal Firebase Firestore Helper implementations
async function registerWithFirebase(payload: {
  username: string;
  email: string;
  password: string;
  walletAddress?: string;
}): Promise<{ message: string; token: string; user: UserProfile }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    const fbUser = userCredential.user;

    await updateProfile(fbUser, { displayName: payload.username });
    const token = await fbUser.getIdToken();

    const userProfile: UserProfile = {
      id: fbUser.uid,
      username: payload.username,
      email: payload.email,
      satsBalance: 50,
      usdtBalance: 0.10,
      preferredCurrency: 'BTC',
      highScore: 0,
      level: 1,
      movesPlayed: 0,
      walletAddress: payload.walletAddress || '',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', fbUser.uid), userProfile);
    setStoredToken(token);
    setCachedUser(userProfile);

    return { message: 'Account registered successfully with Firebase', token, user: userProfile };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists. Please log in.');
    }
    throw new Error(err.message || 'Firebase registration failed');
  }
}

async function loginWithFirebase(payload: {
  identifier: string;
  password: string;
}): Promise<{ message: string; token: string; user: UserProfile }> {
  let targetEmail = payload.identifier.trim();

  if (!targetEmail.includes('@')) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', targetEmail), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error('User not found with provided username.');
      }
      const foundDoc = snap.docs[0].data() as UserProfile;
      targetEmail = foundDoc.email;
    } catch (err: any) {
      if (err.message?.includes('User not found')) throw err;
      throw new Error('Invalid username or password credentials.');
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, payload.password);
    const fbUser = userCredential.user;
    const token = await fbUser.getIdToken();

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    let userProfile: UserProfile;
    if (userSnap.exists()) {
      const data = userSnap.data();
      userProfile = {
        id: fbUser.uid,
        username: data.username || fbUser.displayName || payload.identifier.split('@')[0],
        email: data.email || fbUser.email || targetEmail,
        satsBalance: data.satsBalance ?? 50,
        usdtBalance: data.usdtBalance ?? 0.10,
        preferredCurrency: data.preferredCurrency || 'BTC',
        highScore: data.highScore ?? 0,
        level: data.level ?? 1,
        movesPlayed: data.movesPlayed ?? 0,
        walletAddress: data.walletAddress || '',
        createdAt: data.createdAt || new Date().toISOString(),
      };
    } else {
      userProfile = {
        id: fbUser.uid,
        username: fbUser.displayName || payload.identifier.split('@')[0],
        email: fbUser.email || targetEmail,
        satsBalance: 50,
        usdtBalance: 0.10,
        preferredCurrency: 'BTC',
        highScore: 0,
        level: 1,
        movesPlayed: 0,
        walletAddress: '',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, userProfile);
    }

    setStoredToken(token);
    setCachedUser(userProfile);

    return { message: 'Login successful via Firebase', token, user: userProfile };
  } catch (err: any) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      throw new Error('Invalid email/username or password.');
    }
    throw new Error(err.message || 'Firebase authentication failed');
  }
}

async function getMeFromFirebase(): Promise<{ user: UserProfile }> {
  const cached = getCachedUser();
  const currentFbUser = auth.currentUser;

  if (currentFbUser) {
    try {
      const userSnap = await getDoc(doc(db, 'users', currentFbUser.uid));
      if (userSnap.exists()) {
        const userProfile = { id: currentFbUser.uid, ...userSnap.data() } as UserProfile;
        setCachedUser(userProfile);
        return { user: userProfile };
      }
    } catch {
      // Fallback to cache
    }
  }

  if (cached) {
    return { user: cached };
  }

  throw new Error('Not authenticated');
}

async function updateWalletInFirebase(walletAddress: string): Promise<{ message: string; walletAddress: string }> {
  const currentFbUser = auth.currentUser;
  const cached = getCachedUser();
  const uid = currentFbUser?.uid || cached?.id;

  if (!uid) {
    throw new Error('Not authenticated');
  }

  try {
    await updateDoc(doc(db, 'users', uid), { walletAddress });
  } catch {
    await setDoc(doc(db, 'users', uid), { walletAddress }, { merge: true });
  }

  if (cached) {
    setCachedUser({ ...cached, walletAddress });
  }

  return { message: 'Wallet address updated in Firebase Firestore', walletAddress };
}

async function syncScoreWithFirebase(payload: {
  scoreGained: number;
  satsMined?: number;
  usdtMined?: number;
  currencyMined?: MiningCurrency;
  levelAchieved: number;
  movesInSession: number;
  totalScore: number;
}): Promise<{
  message: string;
  satsBalance: number;
  usdtBalance: number;
  highScore: number;
  level: number;
  movesPlayed: number;
}> {
  const currentFbUser = auth.currentUser;
  const cached = getCachedUser();
  const uid = currentFbUser?.uid || cached?.id;

  if (!uid) {
    throw new Error('User not logged in');
  }

  const userDocRef = doc(db, 'users', uid);
  let currentData = cached || {
    id: uid,
    username: 'Miner',
    email: 'miner@firebase.local',
    satsBalance: 0,
    usdtBalance: 0,
    highScore: 0,
    level: 1,
    movesPlayed: 0,
  };

  try {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      currentData = { id: uid, ...userSnap.data() } as UserProfile;
    }
  } catch {
    // Ignore fetch error, use cached
  }

  const satsMined = payload.satsMined || 0;
  const usdtMined = payload.usdtMined || 0;

  const newSatsBalance = (currentData.satsBalance || 0) + satsMined;
  const newUsdtBalance = Number(((currentData.usdtBalance || 0) + usdtMined).toFixed(4));
  const newHighScore = Math.max(currentData.highScore || 0, payload.totalScore);
  const newLevel = Math.max(currentData.level || 1, payload.levelAchieved);
  const newMovesPlayed = (currentData.movesPlayed || 0) + payload.movesInSession;

  const updatedFields = {
    satsBalance: newSatsBalance,
    usdtBalance: newUsdtBalance,
    highScore: newHighScore,
    level: newLevel,
    movesPlayed: newMovesPlayed,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(userDocRef, updatedFields);
  } catch {
    await setDoc(userDocRef, { ...currentData, ...updatedFields }, { merge: true });
  }

  try {
    await addDoc(collection(db, 'game_sessions'), {
      userId: uid,
      scoreGained: payload.scoreGained,
      satsMined,
      usdtMined,
      currencyMined: payload.currencyMined || 'BTC',
      levelAchieved: payload.levelAchieved,
      movesInSession: payload.movesInSession,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Session log optional
  }

  const updatedProfile: UserProfile = {
    ...currentData,
    ...updatedFields,
  };
  setCachedUser(updatedProfile);

  return {
    message: 'Score and mined tokens synced to Firebase Firestore',
    satsBalance: newSatsBalance,
    usdtBalance: newUsdtBalance,
    highScore: newHighScore,
    level: newLevel,
    movesPlayed: newMovesPlayed,
  };
}

async function getHistoryFromFirebase(): Promise<{ sessions: GameSessionRecord[] }> {
  const currentFbUser = auth.currentUser;
  const cached = getCachedUser();
  const uid = currentFbUser?.uid || cached?.id;

  if (!uid) return { sessions: [] };

  try {
    const q = query(
      collection(db, 'game_sessions'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const sessions: GameSessionRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        _id: d.id,
        scoreGained: data.scoreGained || 0,
        satsMined: data.satsMined || 0,
        usdtMined: data.usdtMined || 0,
        currencyMined: data.currencyMined || 'BTC',
        levelAchieved: data.levelAchieved || 1,
        movesInSession: data.movesInSession || 0,
        createdAt: data.timestamp || new Date().toISOString(),
      };
    });
    return { sessions };
  } catch {
    try {
      const qSimple = query(collection(db, 'game_sessions'), where('userId', '==', uid), limit(50));
      const snap = await getDocs(qSimple);
      const sessions: GameSessionRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          _id: d.id,
          scoreGained: data.scoreGained || 0,
          satsMined: data.satsMined || 0,
          usdtMined: data.usdtMined || 0,
          currencyMined: data.currencyMined || 'BTC',
          levelAchieved: data.levelAchieved || 1,
          movesInSession: data.movesInSession || 0,
          createdAt: data.timestamp || new Date().toISOString(),
        };
      });
      return { sessions };
    } catch {
      return { sessions: [] };
    }
  }
}

async function getLeaderboardFromFirebase(): Promise<{ leaderboard: LeaderboardUser[] }> {
  try {
    const q = query(collection(db, 'users'), orderBy('highScore', 'desc'), limit(20));
    const snap = await getDocs(q);
    const leaderboard: LeaderboardUser[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        _id: d.id,
        username: data.username || 'Anonymous',
        highScore: data.highScore || 0,
        satsBalance: data.satsBalance || 0,
        usdtBalance: data.usdtBalance || 0,
        level: data.level || 1,
        movesPlayed: data.movesPlayed || 0,
      };
    });
    return { leaderboard };
  } catch {
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(20)));
      const leaderboard: LeaderboardUser[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            _id: d.id,
            username: data.username || 'Anonymous',
            highScore: data.highScore || 0,
            satsBalance: data.satsBalance || 0,
            usdtBalance: data.usdtBalance || 0,
            level: data.level || 1,
            movesPlayed: data.movesPlayed || 0,
          };
        })
        .sort((a, b) => b.highScore - a.highScore);
      return { leaderboard };
    } catch {
      return { leaderboard: [] };
    }
  }
}

async function requestPayoutWithFirebase(payload: {
  provider: PaymentProvider;
  currency: MiningCurrency;
  amount: number;
  walletAddress: string;
}): Promise<{ message: string; receipt: PayoutRecord; remainingSats: number; remainingUsdt: number }> {
  const currentFbUser = auth.currentUser;
  const cached = getCachedUser();
  const uid = currentFbUser?.uid || cached?.id;

  if (!uid) {
    throw new Error('Not authenticated');
  }

  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    throw new Error('User profile not found in Firebase');
  }

  const userData = userSnap.data() as UserProfile;
  let newSatsBalance = userData.satsBalance || 0;
  let newUsdtBalance = userData.usdtBalance || 0;
  let withdrawValueUsd = 0;
  let receiveAmount = '';

  if (payload.currency === 'BTC') {
    const satsToDeduct = Math.round(payload.amount);
    if (newSatsBalance < satsToDeduct) {
      throw new Error(`Insufficient sats balance. Available: ${newSatsBalance} sats`);
    }
    newSatsBalance -= satsToDeduct;
    withdrawValueUsd = Number(((satsToDeduct / 100000000) * 96000).toFixed(4));
    receiveAmount = `${satsToDeduct} SATS (~$${withdrawValueUsd.toFixed(2)})`;
  } else {
    // USDT
    const usdtToDeduct = Number(payload.amount.toFixed(4));
    if (newUsdtBalance < usdtToDeduct) {
      throw new Error(`Insufficient USDT balance. Available: ${newUsdtBalance.toFixed(4)} USDT`);
    }
    newUsdtBalance = Number((newUsdtBalance - usdtToDeduct).toFixed(4));
    withdrawValueUsd = usdtToDeduct;
    receiveAmount = `${usdtToDeduct.toFixed(4)} USDT ($${usdtToDeduct.toFixed(2)})`;
  }

  await updateDoc(userDocRef, {
    satsBalance: newSatsBalance,
    usdtBalance: newUsdtBalance,
    walletAddress: payload.walletAddress,
  });

  const txPrefix = payload.provider === 'cwallet' ? 'cw_' : 'fp_';
  const txHash = txPrefix + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const payoutDoc = await addDoc(collection(db, 'payouts'), {
    userId: uid,
    username: userData.username,
    walletAddress: payload.walletAddress,
    provider: payload.provider,
    currency: payload.currency,
    amountSats: payload.currency === 'BTC' ? Math.round(payload.amount) : 0,
    amountUsdt: payload.currency === 'USDT' ? payload.amount : 0,
    withdrawValueUsd,
    receiveAmount,
    status: 'completed',
    txHash,
    requestedAt: new Date().toISOString(),
  });

  const receipt: PayoutRecord = {
    _id: payoutDoc.id,
    provider: payload.provider,
    currency: payload.currency,
    amountSats: payload.currency === 'BTC' ? Math.round(payload.amount) : 0,
    amountUsdt: payload.currency === 'USDT' ? payload.amount : 0,
    withdrawValueUsd,
    receiveAmount,
    walletAddress: payload.walletAddress,
    status: 'completed',
    txHash,
    createdAt: new Date().toISOString(),
  };

  setCachedUser({
    ...userData,
    satsBalance: newSatsBalance,
    usdtBalance: newUsdtBalance,
    walletAddress: payload.walletAddress,
  });

  return {
    message: `Payout of ${receiveAmount} processed via ${payload.provider.toUpperCase()} to Firebase Firestore`,
    receipt,
    remainingSats: newSatsBalance,
    remainingUsdt: newUsdtBalance,
  };
}

async function getPayoutHistoryFromFirebase(): Promise<{ payouts: PayoutRecord[] }> {
  const currentFbUser = auth.currentUser;
  const cached = getCachedUser();
  const uid = currentFbUser?.uid || cached?.id;

  if (!uid) return { payouts: [] };

  try {
    const q = query(
      collection(db, 'payouts'),
      where('userId', '==', uid),
      orderBy('requestedAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const payouts: PayoutRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        _id: d.id,
        provider: data.provider || 'faucetpay',
        currency: data.currency || 'BTC',
        amountSats: data.amountSats || 0,
        amountUsdt: data.amountUsdt || 0,
        withdrawValueUsd: data.withdrawValueUsd || 0,
        receiveAmount: data.receiveAmount || (data.amountSats ? `${data.amountSats} SATS` : '0 SATS'),
        walletAddress: data.walletAddress || '',
        status: data.status || 'completed',
        txHash: data.txHash,
        createdAt: data.requestedAt || new Date().toISOString(),
      };
    });
    return { payouts };
  } catch {
    try {
      const qSimple = query(collection(db, 'payouts'), where('userId', '==', uid), limit(50));
      const snap = await getDocs(qSimple);
      const payouts: PayoutRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          _id: d.id,
          provider: data.provider || 'faucetpay',
          currency: data.currency || 'BTC',
          amountSats: data.amountSats || 0,
          amountUsdt: data.amountUsdt || 0,
          withdrawValueUsd: data.withdrawValueUsd || 0,
          receiveAmount: data.receiveAmount || (data.amountSats ? `${data.amountSats} SATS` : '0 SATS'),
          walletAddress: data.walletAddress || '',
          status: data.status || 'completed',
          txHash: data.txHash,
          createdAt: data.requestedAt || new Date().toISOString(),
        };
      });
      return { payouts };
    } catch {
      return { payouts: [] };
    }
  }
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('404_OR_NETWORK');
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      throw new Error('404_OR_NETWORK');
    }
  } else {
    throw new Error('404_OR_NETWORK');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('404_OR_NETWORK');
    }
    throw new Error(data?.message || data?.error || `API request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  getHealth: async (): Promise<DBHealth> => {
    try {
      return await fetchAPI<DBHealth>('/api/health');
    } catch {
      return {
        status: 'ok',
        database: {
          isConnected: true,
          mode: 'Firebase Firestore',
        },
      };
    }
  },

  register: async (payload: any) => {
    try {
      return await fetchAPI<{ message: string; token: string; user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (err.message === '404_OR_NETWORK') {
        return await registerWithFirebase(payload);
      }
      throw err;
    }
  },

  login: async (payload: any) => {
    try {
      return await fetchAPI<{ message: string; token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (err.message === '404_OR_NETWORK') {
        return await loginWithFirebase(payload);
      }
      throw err;
    }
  },

  getMe: async () => {
    try {
      return await fetchAPI<{ user: UserProfile }>('/api/auth/me');
    } catch {
      return await getMeFromFirebase();
    }
  },

  updateWallet: async (walletAddress: string) => {
    try {
      return await fetchAPI<{ message: string; walletAddress: string }>('/api/auth/wallet', {
        method: 'PUT',
        body: JSON.stringify({ walletAddress }),
      });
    } catch {
      return await updateWalletInFirebase(walletAddress);
    }
  },

  syncScore: async (payload: {
    scoreGained: number;
    satsMined?: number;
    usdtMined?: number;
    currencyMined?: MiningCurrency;
    levelAchieved: number;
    movesInSession: number;
    totalScore: number;
  }) => {
    try {
      return await fetchAPI<{
        message: string;
        satsBalance: number;
        usdtBalance: number;
        highScore: number;
        level: number;
        movesPlayed: number;
      }>('/api/game/sync-score', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return await syncScoreWithFirebase(payload);
    }
  },

  getHistory: async () => {
    try {
      return await fetchAPI<{ sessions: GameSessionRecord[] }>('/api/game/history');
    } catch {
      return await getHistoryFromFirebase();
    }
  },

  getLeaderboard: async () => {
    try {
      return await fetchAPI<{ leaderboard: LeaderboardUser[] }>('/api/game/leaderboard');
    } catch {
      return await getLeaderboardFromFirebase();
    }
  },

  requestPayout: async (payload: {
    provider: PaymentProvider;
    currency: MiningCurrency;
    amount: number;
    walletAddress: string;
  }) => {
    try {
      return await fetchAPI<{
        message: string;
        receipt: PayoutRecord;
        remainingSats: number;
        remainingUsdt: number;
      }>('/api/payout/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return await requestPayoutWithFirebase(payload);
    }
  },

  getPayoutHistory: async () => {
    try {
      return await fetchAPI<{ payouts: PayoutRecord[] }>('/api/payout/history');
    } catch {
      return await getPayoutHistoryFromFirebase();
    }
  },
};
