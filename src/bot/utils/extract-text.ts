export function extractBranchCodeByTaphoaRemark(taphoaRemark: string): string | null {
    if (taphoaRemark.includes('Tạp hóa HN1')) return 'HN1';
    if (taphoaRemark.includes('Mua đồ ăn vặt HN2')) return 'HN2';
    if (taphoaRemark.includes('Mua đồ ăn vặt HN3')) return 'HN3';
    if (taphoaRemark.includes('Mua đồ ăn vặt Vinh')) return 'Vinh';
    if (taphoaRemark.includes('Mua đồ ăn vặt SG')) return 'SG';
    if (taphoaRemark.includes('Mua đồ ăn vặt ĐN')) return 'DN';
    if (taphoaRemark.includes('Tạp hóa QN')) return 'QN';
    return null;
}