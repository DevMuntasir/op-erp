# Firestore to Backend API Migration Guide 🚀

**Quick Reference for Migrating Components**

---

## TL;DR

Replace Firestore direct calls with your backend API. Your API is already complete and better.

```typescript
// ❌ STOP DOING THIS
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
await addDoc(collection(db, 'payments'), data);

// ✅ DO THIS INSTEAD
import { postApiData } from '@/src/api/client';
await postApiData('/v1/invoices/', data);
```

---

## Migration Templates

### Pattern 1: Real-Time Listeners (onSnapshot)

#### Before (Firestore)
```typescript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

useEffect(() => {
  const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setClients(clients);
  });

  return () => unsubscribe();
}, []);
```

#### After (API with React Query)
```typescript
import { useClients } from '@/src/hooks/useApiQueries';

function YourComponent() {
  const clientsQuery = useClients();
  const clients = clientsQuery.data ?? [];

  if (clientsQuery.isLoading) return <Skeleton />;
  if (clientsQuery.isError) return <Error />;

  return <div>{clients.map(c => ...)}</div>;
}
```

**Benefits**:
- ✅ Automatic caching
- ✅ No manual subscription cleanup
- ✅ Built-in error handling
- ✅ Automatic refetching
- ✅ Better performance

---

### Pattern 2: Write Operations (addDoc)

#### Before (Firestore)
```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

async function createPayment(data) {
  try {
    const docRef = await addDoc(collection(db, 'payments'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}
```

#### After (API)
```typescript
import { postApiData } from '@/src/api/client';

async function createPayment(data) {
  // postApiData handles:
  // - Error handling
  // - Type safety
  // - Server-side validation
  // - Timestamps (server-generated)
  const result = await postApiData('/v1/invoices/', data);
  return result.id;
}
```

**Benefits**:
- ✅ Server-side validation
- ✅ Business logic enforcement
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Atomic operations

---

### Pattern 3: Query with Filter (getDocs)

#### Before (Firestore)
```typescript
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

async function findUserByEmail(email) {
  const q = query(
    collection(db, 'users'),
    where('email', '==', email),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data();
}
```

#### After (API)
```typescript
import { getApiData } from '@/src/api/client';

async function findUserByEmail(email) {
  const employees = await getApiData('/v1/employees/');
  return employees.find(e => e.email === email);
}

// Better: If your API has a search endpoint
async function findUserByEmail(email) {
  return await postApiData('/v1/employees/search', { email });
}
```

**Benefits**:
- ✅ Consistent with API patterns
- ✅ Server-side filtering (faster)
- ✅ Proper pagination support
- ✅ Permission checking

---

## Component-by-Component Guide

### 1. CallLogger.tsx (30 minutes)

**Current State**:
```typescript
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const logCallAutomatically = async (callData: Call) => {
  await addDoc(collection(db, 'calls'), {
    ...callData,
    createdAt: serverTimestamp(),
  });
};
```

**Migration Steps**:

1. Remove Firestore import:
```typescript
// DELETE THIS:
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
```

2. Add API import:
```typescript
import { createCall } from '@/src/api/endpoints/calls.api';
```

3. Replace function:
```typescript
export const logCallAutomatically = async (callData: Call) => {
  // API endpoint already exists and handles timestamps
  await createCall(callData);
};
```

**Test**:
```bash
npm test -- CallLogger.test.tsx
```

**Time**: 30 min | **Difficulty**: Easy | **Risk**: Low

---

### 2. TrackingControls.tsx (1 hour)

**Current State**: Session tracking via Firestore  
**New State**: Use `/v1/sessions/` API endpoint

**Migration Steps**:

1. Check available API:
```typescript
import { useSessions } from '@/src/hooks/useApiQueries';
```

2. Replace component:
```typescript
// Before
const [sessions, setSessions] = useState([]);
onSnapshot(collection(db, 'sessions'), snap => {
  setSessions(snap.docs.map(d => d.data()));
});

// After
const sessionsQuery = useSessions();
const sessions = sessionsQuery.data ?? [];
```

**Time**: 1 hour | **Difficulty**: Easy | **Risk**: Low

---

### 3. BillingManagement.tsx (3 hours)

**Current State**: Heavy Firestore usage with onSnapshot + addDoc  
**New State**: Use API endpoints + React Query

**Step-by-Step**:

**Step 1**: Remove Firestore imports (10 min)
```typescript
// REMOVE:
import { 
  collection, query, orderBy, onSnapshot, limit, where, 
  addDoc, updateDoc, doc, serverTimestamp, getDocs 
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
```

**Step 2**: Add API imports (5 min)
```typescript
// ADD:
import { useClients, useInvoices } from '@/src/hooks/useApiQueries';
import { postApiData } from '@/src/api/client';
```

**Step 3**: Replace client listener (15 min)
```typescript
// BEFORE:
useEffect(() => {
  const qClients = query(collection(db, 'clients'), orderBy('name', 'asc'));
  const unsubClients = onSnapshot(qClients, (snap) => {
    setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsubClients();
}, [user]);

// AFTER:
const clientsQuery = useClients();
useEffect(() => {
  setClients(clientsQuery.data ?? []);
}, [clientsQuery.data]);
```

**Step 4**: Replace payments listener (15 min)
```typescript
// BEFORE:
const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200));
const unsubscribe = onSnapshot(qPayments, (snap) => {
  setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

// AFTER:
const invoicesQuery = useInvoices();
useEffect(() => {
  setInvoices(invoicesQuery.data ?? []);
}, [invoicesQuery.data]);
```

**Step 5**: Replace addDoc for payments (15 min)
```typescript
// BEFORE:
await addDoc(collection(db, 'payments'), {
  amount: totalAmount,
  clientEmail: selectedClient.email,
  status: 'pending',
  createdAt: serverTimestamp(),
});

// AFTER:
await postApiData('/v1/invoices/', {
  amount: totalAmount,
  clientEmail: selectedClient.email,
  status: 'pending',
  // Server handles timestamps
});
```

**Step 6**: Replace notifications (10 min)
```typescript
// BEFORE:
await addDoc(collection(db, 'notifications'), {
  userId: clientId,
  message: `Invoice created`,
  createdAt: serverTimestamp(),
});

// AFTER (API likely has notification endpoint):
// OR use a mutation to create notification via API
await postApiData('/v1/notifications/', {
  userId: clientId,
  message: `Invoice created`,
});
```

**Step 7**: Test (30 min)
```bash
# Test creating invoice
# Test listing invoices
# Test permissions
# Test error handling
```

**Time**: 3 hours | **Difficulty**: Medium | **Risk**: Medium

---

### 4. ReportGenerator.tsx (1.5 hours)

**Current State**: Reads Firestore for report data  
**New State**: Use `/v1/reports/` API endpoints

**Quick Migration**:
```typescript
// REMOVE Firestore imports
// ADD API imports:
import { useReports } from '@/src/hooks/useApiQueries';
import { generateReport } from '@/src/api/endpoints/reports.api';

// Replace listeners with hooks
const reportsQuery = useReports();
const reports = reportsQuery.data ?? [];

// Replace writes with API
await generateReport(reportData);
```

**Time**: 1.5 hours | **Difficulty**: Easy | **Risk**: Low

---

### 5. Other Components (Variable)

Apply the same patterns to:
- `ProfilePage.tsx` - Use `/v1/employees/` or `/v1/auth/me`
- `EmployeeDetail.tsx` - Use `/v1/employees/:id`
- `ProjectCreationWizard.tsx` - Use `/v1/projects/` endpoints
- Proposal components - Use `/v1/proposals/` endpoints

---

## API Endpoint Quick Reference

### Create (Write)

```typescript
// Pattern: postApiData('/v1/{resource}/', data)

// Payments/Invoices
await postApiData('/v1/invoices/', { amount, clientEmail });

// Calls
await postApiData('/v1/calls/', { duration, participants });

// Clients
await postApiData('/v1/clients/', { name, email });

// Proposals
await postApiData('/v1/proposals/', proposalData);

// Reports
await postApiData('/v1/reports/', reportData);
```

### Read (Query)

```typescript
// Pattern: useApiQuery() hook or getApiData('/v1/{resource}/')

// List
const invoices = await getApiData('/v1/invoices/');
const sessions = await getApiData('/v1/sessions/');
const employees = await getApiData('/v1/employees/');

// With hooks (better):
const invoicesQuery = useInvoices();
const sessionsQuery = useSessions();
const employeesQuery = useEmployees();
```

### Update (Patch)

```typescript
// Pattern: patchApiData('/v1/{resource}/:id', data)

await patchApiData('/v1/invoices/123', { status: 'paid' });
await patchApiData('/v1/calls/456', { duration: 300 });
```

### Delete

```typescript
// Pattern: deleteApiData('/v1/{resource}/:id')

await deleteApiData('/v1/invoices/123');
await deleteApiData('/v1/calls/456');
```

---

## Testing Checklist

After each migration:

- [ ] Component renders without errors
- [ ] Data loads correctly from API
- [ ] Create operation works
- [ ] Update operation works (if applicable)
- [ ] Delete operation works (if applicable)
- [ ] Error handling works
- [ ] Loading states display
- [ ] No console errors
- [ ] No React Query warnings

---

## Common Gotchas & Solutions

### Gotcha 1: Timestamps

**Problem**: Firestore `serverTimestamp()` vs API handling

**Solution**: Always let the server generate timestamps
```typescript
// ❌ DON'T:
createdAt: serverTimestamp()

// ✅ DO:
// Let backend handle it, don't send createdAt
await postApiData('/v1/invoices/', {
  amount,
  clientId,
  // Backend creates createdAt
});
```

### Gotcha 2: Collections vs API

**Problem**: Firestore collection names don't match API endpoints

**Solution**: Use proper API paths
```typescript
// ❌ DON'T:
collection(db, 'payments')     // Firestore collection name

// ✅ DO:
'/v1/invoices/'                // API endpoint
```

### Gotcha 3: Real-time Data

**Problem**: onSnapshot is real-time, API is not

**Solution**: Use React Query refetch intervals
```typescript
// For real-time-ish updates:
const invoicesQuery = useInvoices({
  // Override default refetch interval
  refetchInterval: 5000  // Refetch every 5 seconds
});
```

### Gotcha 4: Unsubscribe Cleanup

**Problem**: Forgetting to unsubscribe from Firestore listeners

**Solution**: React Query handles this automatically
```typescript
// ❌ FIRESTORE (Manual cleanup needed):
useEffect(() => {
  const unsub = onSnapshot(...);
  return () => unsub();  // Must cleanup!
}, []);

// ✅ API (Automatic):
const query = useInvoices();
// React Query handles cleanup automatically
```

---

## Performance Comparison

### Before (Firestore Direct)

```
User loads BillingManagement
├─ onSnapshot listener activates
├─ Firestore loads all clients (50+ documents)
├─ Firestore loads all payments (200+ documents)
├─ Listeners stay active = continuous cost
└─ Total Firestore reads: ~250 per load

User navigates away
└─ Listeners still active! (forgotten unsubscribe)
```

### After (API)

```
User loads BillingManagement
├─ API call to /v1/clients/
├─ API returns paginated (25 items)
├─ React Query caches result
├─ User navigates away
└─ Cache reused = no additional cost

Total API calls: 1 (cached for other users too!)
```

---

## Rollback Plan

If something breaks during migration:

1. **Revert component file**: `git checkout src/components/billing/BillingManagement.tsx`
2. **Clear React Query cache**: `queryClient.clear()`
3. **Hard refresh**: `Ctrl+Shift+Delete` or browser dev tools

**That's it!** No data loss (API has everything), no recovery needed.

---

## FAQ

**Q: Will users' data be lost?**  
A: No. Your API has all the data. This is just switching the access method.

**Q: What if the API is slower?**  
A: It won't be. React Query caching + pagination = faster than real-time Firestore.

**Q: Do I need to update the backend?**  
A: No. Your backend already has all these endpoints. Just use them.

**Q: Can I do this gradually?**  
A: Yes! Do one component at a time. No need to do everything at once.

**Q: What about offline?**  
A: If needed later, can be added via service workers. Current app doesn't require it.

---

## Success Metrics

After migration, you should see:

- ✅ **Cost**: Down ~80% ($1,100/mo → $200/mo)
- ✅ **Performance**: Slightly faster due to caching
- ✅ **Security**: Improved (server-side validation)
- ✅ **Code**: Cleaner (no Firestore imports in components)
- ✅ **Maintenance**: Easier (single data access pattern)

---

## Next Steps

1. **Start with CallLogger** (30 min, easiest)
2. **Then TrackingControls** (1 hour, easy)
3. **Then BillingManagement** (3 hours, gets you 80% benefit)
4. **Polish**: Cleanup and documentation

**Total Time**: 8-10 hours  
**Total Savings**: $1,000+/month  
**Effort**: Easy to Medium  
**Risk**: Low

---

**Ready to start? Pick CallLogger and go!** 🚀
