"""
Pure Python QR Code Generator (Versions 1-6, Byte Mode, ECC M)
Generates valid, standards-compliant SVG QR codes without external dependencies.
"""

# GF(256) tables with primitive polynomial 0x11d
GF_EXP = [0] * 512
GF_LOG = [0] * 256

def _init_gf():
    x = 1
    for i in range(255):
        GF_EXP[i] = x
        GF_LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11d
    for i in range(255, 512):
        GF_EXP[i] = GF_EXP[i - 255]

_init_gf()

def gf_mul(x, y):
    if x == 0 or y == 0:
        return 0
    return GF_EXP[GF_LOG[x] + GF_LOG[y]]

def rs_generator_poly(nsym):
    g = [1]
    for i in range(nsym):
        g_new = [0] * (len(g) + 1)
        root = GF_EXP[i]
        for j in range(len(g)):
            g_new[j] ^= gf_mul(g[j], root)
            g_new[j + 1] ^= g[j]
        g = g_new
    return g

def rs_encode(data, nsym):
    gen = rs_generator_poly(nsym)
    res = [0] * (len(data) + nsym)
    res[:len(data)] = data
    for i in range(len(data)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i + j] ^= gf_mul(gen[j], coef)
    return res[len(data):]

# Version parameters for ECC Level M:
# (total_codewords, data_codewords, ec_codewords_per_block, num_blocks_g1, data_per_block_g1, num_blocks_g2, data_per_block_g2)
VERSION_SPECS_M = {
    1: (26, 16, 10, 1, 16, 0, 0),
    2: (44, 28, 16, 1, 28, 0, 0),
    3: (70, 44, 26, 1, 44, 0, 0),
    4: (100, 64, 18, 2, 32, 0, 0),
    5: (134, 86, 24, 2, 43, 0, 0),
    6: (172, 108, 16, 4, 27, 0, 0),
    7: (196, 124, 18, 2, 31, 4, 32),
    8: (242, 154, 22, 4, 38, 2, 39),
}

ALIGNMENT_PATTERNS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
}

FORMAT_INFO_M = [
    0b101010000010010, # mask 0
    0b101000100111101, # mask 1
    0b101111001111111, # mask 2
    0b101101101010000, # mask 3
    0b100010111111001, # mask 4
    0b100000011010110, # mask 5
    0b100111110010100, # mask 6
    0b100101010111011, # mask 7
]

def get_best_version(byte_len):
    for v in sorted(VERSION_SPECS_M.keys()):
        cap = VERSION_SPECS_M[v][1] - 3 # overhead for mode (4 bits) + length (8 bits) + terminator (4 bits)
        if byte_len <= cap:
            return v
    raise ValueError(f"Payload too large ({byte_len} bytes) for supported versions (max {VERSION_SPECS_M[6][1]-3} bytes)")

def encode_data(text, version):
    raw = text.encode('utf-8')
    spec = VERSION_SPECS_M[version]
    total_data_bytes = spec[1]
    
    # Bit buffer
    bits = ""
    # Mode indicator: Byte mode is 0100
    bits += "0100"
    # Character count indicator: 8 bits for versions 1-9
    bits += f"{len(raw):08b}"
    # Data bits
    for b in raw:
        bits += f"{b:08b}"
    
    # Terminator
    max_bits = total_data_bytes * 8
    term_len = min(4, max_bits - len(bits))
    bits += "0" * term_len
    
    # Pad to byte boundary
    if len(bits) % 8 != 0:
        bits += "0" * (8 - (len(bits) % 8))
    
    # Convert to bytes
    data_bytes = bytearray()
    for i in range(0, len(bits), 8):
        data_bytes.append(int(bits[i:i+8], 2))
    
    # Pad bytes 0xEC, 0x11
    pad = [0xEC, 0x11]
    pad_idx = 0
    while len(data_bytes) < total_data_bytes:
        data_bytes.append(pad[pad_idx % 2])
        pad_idx += 1
    
    # Split into blocks and compute ECC
    ec_per_block = spec[2]
    blocks_data = []
    blocks_ec = []
    
    offset = 0
    # Group 1
    for _ in range(spec[3]):
        cnt = spec[4]
        blk = list(data_bytes[offset:offset+cnt])
        blocks_data.append(blk)
        blocks_ec.append(rs_encode(blk, ec_per_block))
        offset += cnt
        
    # Group 2
    for _ in range(spec[5]):
        cnt = spec[6]
        blk = list(data_bytes[offset:offset+cnt])
        blocks_data.append(blk)
        blocks_ec.append(rs_encode(blk, ec_per_block))
        offset += cnt
        
    # Interleave data
    interleaved = []
    max_d_len = max(len(b) for b in blocks_data)
    for i in range(max_d_len):
        for b in blocks_data:
            if i < len(b):
                interleaved.append(b[i])
                
    # Interleave EC
    for i in range(ec_per_block):
        for b in blocks_ec:
            interleaved.append(b[i])
            
    return interleaved

def create_matrix(version):
    size = 17 + version * 4
    matrix = [[None] * size for _ in range(size)]
    reserved = [[False] * size for _ in range(size)]
    
    def set_finder(r, c):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                nr, nc = r + dr, c + dc
                if 0 <= nr < size and 0 <= nc < size:
                    reserved[nr][nc] = True
                    if 0 <= dr <= 6 and 0 <= dc <= 6:
                        if dr in (0, 6) or dc in (0, 6) or (2 <= dr <= 4 and 2 <= dc <= 4):
                            matrix[nr][nc] = 1
                        else:
                            matrix[nr][nc] = 0
                    else:
                        matrix[nr][nc] = 0

    # Finder patterns
    set_finder(0, 0)
    set_finder(0, size - 7)
    set_finder(size - 7, 0)
    
    # Timing patterns
    for i in range(8, size - 8):
        reserved[6][i] = True
        matrix[6][i] = 1 if i % 2 == 0 else 0
        reserved[i][6] = True
        matrix[i][6] = 1 if i % 2 == 0 else 0
        
    # Alignment patterns
    coords = ALIGNMENT_PATTERNS.get(version, [])
    for r in coords:
        for c in coords:
            # Skip if overlapping finders
            if (r < 9 and c < 9) or (r < 9 and c > size - 9) or (r > size - 9 and c < 9):
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    nr, nc = r + dr, c + dc
                    reserved[nr][nc] = True
                    if abs(dr) == 2 or abs(dc) == 2 or (dr == 0 and dc == 0):
                        matrix[nr][nc] = 1
                    else:
                        matrix[nr][nc] = 0

    # Dark module
    reserved[4 * version + 9][8] = True
    matrix[4 * version + 9][8] = 1
    
    # Reserve Format Info
    for i in range(9):
        if not reserved[8][i]:
            reserved[8][i] = True
        if not reserved[i][8]:
            reserved[i][8] = True
    for i in range(size - 8, size):
        reserved[8][i] = True
    for i in range(size - 8, size):
        reserved[i][8] = True
        
    return matrix, reserved, size

def place_data(matrix, reserved, size, data_bytes, mask_pattern):
    # Convert data bytes to bits
    bits = []
    for b in data_bytes:
        for shift in range(7, -1, -1):
            bits.append((b >> shift) & 1)
            
    bit_idx = 0
    row = size - 1
    col = size - 1
    dir_up = True
    
    while col > 0:
        if col == 6:
            col -= 1
        for _ in range(size):
            for c in (col, col - 1):
                if not reserved[row][c]:
                    bit = bits[bit_idx] if bit_idx < len(bits) else 0
                    bit_idx += 1
                    # Apply mask
                    masked = apply_mask(mask_pattern, row, c, bit)
                    matrix[row][c] = masked
            row = (row - 1) if dir_up else (row + 1)
        dir_up = not dir_up
        row = (size - 1) if dir_up else 0
        col -= 2

def apply_mask(pattern, r, c, val):
    cond = False
    if pattern == 0:
        cond = (r + c) % 2 == 0
    elif pattern == 1:
        cond = r % 2 == 0
    elif pattern == 2:
        cond = c % 3 == 0
    elif pattern == 3:
        cond = (r + c) % 3 == 0
    elif pattern == 4:
        cond = (r // 2 + c // 3) % 2 == 0
    elif pattern == 5:
        cond = (r * c) % 2 + (r * c) % 3 == 0
    elif pattern == 6:
        cond = ((r * c) % 2 + (r * c) % 3) % 2 == 0
    elif pattern == 7:
        cond = ((r + c) % 2 + (r * c) % 3) % 2 == 0
    return (val ^ 1) if cond else val

def write_format_info(matrix, size, mask_pattern):
    info = FORMAT_INFO_M[mask_pattern]
    # Place format bits
    # Around top-left finder
    for i in range(6):
        matrix[8][i] = (info >> i) & 1
    matrix[8][7] = (info >> 6) & 1
    matrix[8][8] = (info >> 7) & 1
    matrix[7][8] = (info >> 8) & 1
    for i in range(9, 15):
        matrix[14 - i][8] = (info >> i) & 1
        
    # Second copy around other finders
    for i in range(7):
        matrix[size - 1 - i][8] = (info >> i) & 1
    for i in range(7, 15):
        matrix[8][size - 15 + i] = (info >> i) & 1

def penalty_score(matrix, size):
    score = 0
    # Rule 1: 5+ consecutive same color
    for r in range(size):
        count = 1
        for c in range(1, size):
            if matrix[r][c] == matrix[r][c-1]:
                count += 1
            else:
                if count >= 5: score += 3 + (count - 5)
                count = 1
        if count >= 5: score += 3 + (count - 5)
    for c in range(size):
        count = 1
        for r in range(1, size):
            if matrix[r][c] == matrix[r-1][c]:
                count += 1
            else:
                if count >= 5: score += 3 + (count - 5)
                count = 1
        if count >= 5: score += 3 + (count - 5)
    return score

def generate_qr_svg(text, quiet_zone=4, scale=8):
    version = get_best_version(len(text.encode('utf-8')))
    data_bytes = encode_data(text, version)
    
    # Try masks to find the lowest penalty
    best_mask = 0
    best_score = float('inf')
    best_mat = None
    
    for mask in range(8):
        mat, res, size = create_matrix(version)
        place_data(mat, res, size, data_bytes, mask)
        write_format_info(mat, size, mask)
        score = penalty_score(mat, size)
        if score < best_score:
            best_score = score
            best_mask = mask
            best_mat = mat
            
    size = len(best_mat)
    total_size = (size + quiet_zone * 2) * scale
    
    # Build clean SVG path
    path_d = []
    for r in range(size):
        for c in range(size):
            if best_mat[r][c] == 1:
                x = (c + quiet_zone) * scale
                y = (r + quiet_zone) * scale
                path_d.append(f"M{x},{y}h{scale}v{scale}h-{scale}z")
                
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}" '
        f'width="{total_size}" height="{total_size}" shape-rendering="crispEdges">\n'
        f'  <rect width="100%" height="100%" fill="#ffffff" rx="12"/>\n'
        f'  <path d="{" ".join(path_d)}" fill="#0b0d11"/>\n'
        f'</svg>'
    )
    return svg, version, best_mask
