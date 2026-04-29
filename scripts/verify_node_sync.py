"""
Verify all 3 data sources use identical node IDs.
Run: python scripts/verify_node_sync.py
"""
import json, ast, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Source A: highway_graph.json
with open(os.path.join(ROOT, 'backend', 'graph', 'highway_graph.json'), encoding='utf-8') as f:
    graph = json.load(f)
graph_ids = sorted(n['id'] for n in graph['nodes'])

# Source B: seed_demo_data.py (parse NODES dict keys)
seed_path = os.path.join(ROOT, 'scripts', 'seed_demo_data.py')
with open(seed_path, encoding='utf-8') as f:
    seed_content = f.read()
# Extract keys from NODES = { ... }
seed_ids = sorted(re.findall(r'"([\w\-]+)":\s*\{', seed_content.split('NODES = {')[1].split('\n}')[0]))

# Source C: mockData.js (extract keys from mockNodes)
mock_path = os.path.join(ROOT, 'frontend', 'src', 'data', 'mockData.js')
with open(mock_path, encoding='utf-8') as f:
    mock_content = f.read()
mock_ids = sorted(re.findall(r"'([\w\-]+)':\s*\{", mock_content.split('mockNodes = {')[1].split('};')[0]))

print("=" * 60)
print("A.P.E.X NODE ID SYNC VERIFICATION")
print("=" * 60)

print(f"\n[A] highway_graph.json: {len(graph_ids)} nodes")
print(f"    {', '.join(graph_ids)}")

print(f"\n[B] seed_demo_data.py:  {len(seed_ids)} nodes")
print(f"    {', '.join(seed_ids)}")

print(f"\n[C] mockData.js:        {len(mock_ids)} nodes")
print(f"    {', '.join(mock_ids)}")

# Check perfect match
all_match = (graph_ids == seed_ids == mock_ids)
print(f"\n{'=' * 60}")
if all_match:
    print("✅ PERFECT MATCH — All 3 sources have identical node IDs!")
else:
    print("❌ MISMATCH DETECTED!")
    only_graph = set(graph_ids) - set(seed_ids) - set(mock_ids)
    only_seed = set(seed_ids) - set(graph_ids)
    only_mock = set(mock_ids) - set(graph_ids)
    missing_seed = set(graph_ids) - set(seed_ids)
    missing_mock = set(graph_ids) - set(mock_ids)
    if only_graph: print(f"  Only in graph: {only_graph}")
    if only_seed: print(f"  Only in seed:  {only_seed}")
    if only_mock: print(f"  Only in mock:  {only_mock}")
    if missing_seed: print(f"  Missing from seed: {missing_seed}")
    if missing_mock: print(f"  Missing from mock: {missing_mock}")

# Verify processingRate exists for all graph nodes
print(f"\n{'=' * 60}")
print("processingRate CHECK:")
missing_rate = [n['id'] for n in graph['nodes'] if 'processingRate' not in n]
if not missing_rate:
    print("✅ All 15 nodes have processingRate")
else:
    print(f"❌ Missing processingRate: {missing_rate}")

# Verify highway field
print(f"\nhighway field CHECK:")
missing_hwy = [n['id'] for n in graph['nodes'] if 'highway' not in n]
if not missing_hwy:
    print("✅ All 15 nodes have highway field")
else:
    print(f"❌ Missing highway: {missing_hwy}")

print(f"\n{'=' * 60}")
sys.exit(0 if all_match else 1)
